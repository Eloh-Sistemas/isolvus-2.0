import { useState, useRef, useEffect } from 'react';
import MarkdownIt from 'markdown-it';
import * as XLSX from 'xlsx';
import Swal from 'sweetalert2';
import api from '../../servidor/api';
import Dashboard from '../../componentes/dashboardIA/dashboardIA';
import './iaEloh.css';
import Menu from '../Menu/Menu';

const md = new MarkdownIt();
const CONVERSATION_STORAGE_KEY = 'eloh-conversation-id';
const MESSAGES_STORAGE_PREFIX = 'eloh-messages:';
const FEEDBACK_STORAGE_PREFIX = 'eloh-feedback:';

function normalizeForId(value) {
  return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function buildMessageFingerprint(message = {}) {
  const role = normalizeForId(message.role);
  const type = normalizeForId(message.type);
  const content = normalizeForId(message.content);
  const rawDataLen = Array.isArray(message.rawData) ? message.rawData.length : 0;
  const dashboardType = normalizeForId(message.dashboard?.chart?.type || '');

  return [role, type, content, rawDataLen, dashboardType].join('|');
}

function formatConversationDate(value) {
  if (!value) {
    return '';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function buildConversationRequest(payload = {}) {
  return {
    ...payload,
    id_usuario: Number(localStorage.getItem('id_usuario') || 0),
    id_grupo_empresa: Number(localStorage.getItem('id_grupo_empresa') || 0),
  };
}

function createConversationId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getStoredConversationId() {
  const storedConversationId = localStorage.getItem(CONVERSATION_STORAGE_KEY);

  if (storedConversationId) {
    return storedConversationId;
  }

  const newConversationId = createConversationId();
  localStorage.setItem(CONVERSATION_STORAGE_KEY, newConversationId);
  return newConversationId;
}

function getStoredMessages(conversationId) {
  try {
    const rawMessages = localStorage.getItem(`${MESSAGES_STORAGE_PREFIX}${conversationId}`);
    return rawMessages ? JSON.parse(rawMessages) : [];
  } catch (error) {
    console.error('Erro ao carregar histórico local da conversa:', error);
    return [];
  }
}

function getStoredFeedback(conversationId) {
  try {
    const rawFeedback = localStorage.getItem(`${FEEDBACK_STORAGE_PREFIX}${conversationId}`);
    return rawFeedback ? JSON.parse(rawFeedback) : {};
  } catch (error) {
    console.error('Erro ao carregar feedback local da conversa:', error);
    return {};
  }
}

function buildFollowUpSuggestions(question = '', answer = '') {
  const normalizedQuestion = String(question || '').trim();
  const normalizedAnswer = String(answer || '').trim();
  const suggestions = [];

  if (normalizedQuestion) {
    suggestions.push(`Pode detalhar melhor: ${normalizedQuestion.toLowerCase()}?`);
  }

  if (/mes|mês|periodo|período|data/i.test(normalizedQuestion) || /mes|mês|periodo|período|data/i.test(normalizedAnswer)) {
    suggestions.push('Pode comparar esse resultado com o período anterior?');
  }

  if (/cliente|fornecedor|funcionario|funcionário|empresa/i.test(normalizedQuestion) || /cliente|fornecedor|funcionario|funcionário|empresa/i.test(normalizedAnswer)) {
    suggestions.push('Quais são os 5 itens mais relevantes desse resultado?');
  }

  suggestions.push('Quais ações práticas você recomenda com base nesses dados?');
  suggestions.push('Pode resumir isso em tópicos objetivos?');

  return [...new Set(suggestions)].slice(0, 3);
}

function deriveRelatedQuestionsFromHistory(messages = []) {
  if (!Array.isArray(messages) || messages.length === 0) {
    return [];
  }

  const lastUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'user' && message.type === 'text' && String(message.content || '').trim());

  const lastAssistantMessage = [...messages]
    .reverse()
    .find((message) => message.role === 'Eloh' && message.type === 'text' && String(message.content || '').trim());

  if (!lastUserMessage && !lastAssistantMessage) {
    return [];
  }

  return buildFollowUpSuggestions(lastUserMessage?.content || '', lastAssistantMessage?.content || '');
}

function hydrateMessages(messages = []) {
  const occurrenceByFingerprint = new Map();

  return messages.map((message) => {
    const hydratedMessage = {
      ...message,
    };

    if (hydratedMessage.type === 'table-prompt') {
      return {
        ...hydratedMessage,
        showTable: Boolean(hydratedMessage.showTable),
        table: generateTableHtml(hydratedMessage.rawData || []),
      };
    }

    const fingerprint = buildMessageFingerprint(hydratedMessage);
    const occurrence = (occurrenceByFingerprint.get(fingerprint) || 0) + 1;
    occurrenceByFingerprint.set(fingerprint, occurrence);
    const stableId = hydratedMessage.id || `${fingerprint}#${occurrence}`;

    if (hydratedMessage.type === 'text' && hydratedMessage.role === 'Eloh') {
      return {
        ...hydratedMessage,
        id: stableId,
        suggestions: Array.isArray(hydratedMessage.suggestions) ? hydratedMessage.suggestions : [],
      };
    }

    return {
      ...hydratedMessage,
      id: stableId,
    };
  });
}

function generateTableHtml(dados) {
  if (!Array.isArray(dados) || dados.length <= 1) return '';

  const headers = Object.keys(dados[0]);
  const headerRow = `<tr>${headers.map((key) => `<th>${key}</th>`).join('')}</tr>`;
  const bodyRows = dados
    .map((row) => `<tr>${headers.map((key) => `<td>${row[key]}</td>`).join('')}</tr>`)
    .join('');

  return `
    <div style="overflow-y: auto; max-height: 400px; width: 100%;">
      <table class="table table-bordered w-100">
        <thead class="table-light">
          ${headerRow}
        </thead>
        <tbody>
          ${bodyRows}
        </tbody>
      </table>
    </div>
  `;
}

function IaEloh() {
  const [conversationId, setConversationId] = useState(() => getStoredConversationId());
  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [messages, setMessages] = useState(() => hydrateMessages(getStoredMessages(getStoredConversationId())));
  const [relatedQuestions, setRelatedQuestions] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const [deletingConversationId, setDeletingConversationId] = useState('');
  const [feedbackByMessage, setFeedbackByMessage] = useState(() => getStoredFeedback(getStoredConversationId()));
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  // Auto-resize do textarea conforme digitação
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const next = Math.min(el.scrollHeight, 200);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > 200 ? 'auto' : 'hidden';
  }, [input]);

  const loadConversationList = async () => {
    setLoadingConversations(true);

    try {
      const response = await api.post(
        'v1/ElohIA/conversas',
        buildConversationRequest({ limit: 30 })
      );

      setConversations(response.data?.conversations || []);
    } catch (error) {
      console.error('Erro ao carregar lista de conversas:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    localStorage.setItem(CONVERSATION_STORAGE_KEY, conversationId);
  }, [conversationId]);

  useEffect(() => {
    try {
      // Remove rawData (pode ser muito grande) antes de persistir no localStorage
      const messagesParaSalvar = messages.map((msg) =>
        msg.type === 'table-prompt' ? { ...msg, rawData: undefined, table: undefined } : msg
      );
      localStorage.setItem(`${MESSAGES_STORAGE_PREFIX}${conversationId}`, JSON.stringify(messagesParaSalvar));
    } catch {
      // QuotaExceededError ou outro erro de localStorage não deve travar a UI
    }
  }, [conversationId, messages]);

  useEffect(() => {
    localStorage.setItem(`${FEEDBACK_STORAGE_PREFIX}${conversationId}`, JSON.stringify(feedbackByMessage));
  }, [conversationId, feedbackByMessage]);

  useEffect(() => {
    loadConversationList();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadConversationHistory = async () => {
      try {
        const response = await api.post(
          'v1/ElohIA/historico',
          buildConversationRequest({ conversationId })
        );

        if (!isMounted) {
          return;
        }

        const nextMessages = hydrateMessages(response.data?.messages || []);

        if (nextMessages.length > 0) {
          setMessages(nextMessages);
          setFeedbackByMessage(getStoredFeedback(conversationId));
          setRelatedQuestions(deriveRelatedQuestionsFromHistory(nextMessages));
          return;
        }

        const fallbackMessages = hydrateMessages(getStoredMessages(conversationId));
        setMessages(fallbackMessages);
        setFeedbackByMessage(getStoredFeedback(conversationId));
        setRelatedQuestions(deriveRelatedQuestionsFromHistory(fallbackMessages));
      } catch (error) {
        if (isMounted) {
          console.error('Erro ao carregar histórico persistido:', error);
          const fallbackMessages = hydrateMessages(getStoredMessages(conversationId));
          setMessages(fallbackMessages);
          setFeedbackByMessage(getStoredFeedback(conversationId));
          setRelatedQuestions(deriveRelatedQuestionsFromHistory(fallbackMessages));
        }
      }
    };

    loadConversationHistory();

    return () => {
      isMounted = false;
    };
  }, [conversationId]);

  const handleSend = async (explicitQuestion = '') => {
    const question = explicitQuestion || input;

    if (!String(question).trim()) return;

    const userMessage = { role: 'user', type: 'text', content: question };
    setMessages((prev) => hydrateMessages([...prev, userMessage]));
    if (!explicitQuestion) {
      setInput('');
    }
    setLoading(true);

    const iaResponse = await fakeIaResponse(question);
    const newMessages = [];

    if (iaResponse.respostaAnalista) {
      newMessages.push({
        role: 'Eloh',
        type: 'text',
        content: iaResponse.respostaAnalista,
        suggestions: [],
      });
    }

    if (Array.isArray(iaResponse.tabela) && iaResponse.tabela.length > 1) {
      newMessages.push({
        role: 'Eloh',
        type: 'table-prompt',
        showTable: false,
        table: generateTableHtml(iaResponse.tabela),
        rawData: iaResponse.tabela,
      });
    }

    if (iaResponse.dashboard?.chart) {
      newMessages.push({
        role: 'Eloh',
        type: 'dashboard',
        dashboard: iaResponse.dashboard,
      });
    }

    setMessages((prev) => hydrateMessages([...prev, ...newMessages]));

    const sugestoes = Array.isArray(iaResponse.sugestoes) && iaResponse.sugestoes.length > 0
      ? iaResponse.sugestoes
      : buildFollowUpSuggestions(question, iaResponse.respostaAnalista || '');
    setRelatedQuestions(sugestoes);

    setLoading(false);
  };

  const fakeIaResponse = async (pergunta) => {
    try {
      const resposta = await api.post(
        'v1/ElohIA',
        buildConversationRequest({ message: pergunta, conversationId })
      );

      if (resposta.data?.conversation?.conversationId) {
        setConversationId(resposta.data.conversation.conversationId);
      }

      loadConversationList();

      return resposta.data;
    } catch (err) {
      console.error(err);
      return { respostaAnalista: 'Desculpe, algo deu errado ao buscar a resposta.' };
    }
  };

  const exportToExcel = (dados, fileName = 'tabela_IA.xlsx') => {
    const worksheet = XLSX.utils.json_to_sheet(dados);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Dados');
    XLSX.writeFile(workbook, fileName);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!loading && input.trim()) handleSend();
    }
    // Shift+Enter: quebra de linha (comportamento padrão do textarea)
  };

  const handleShowTable = (index) => {
    setMessages((prev) => {
      const newMessages = [...prev];
      newMessages[index] = {
        ...newMessages[index],
        showTable: true,
        table: generateTableHtml(newMessages[index].rawData || []),
      };
      return newMessages;
    });
  };

  const handleUseSuggestion = (suggestion) => {
    setInput('');
    handleSend(suggestion);
  };

  const handleFeedbackResponse = async (messageId, type) => {
    if (!messageId) {
      return;
    }

    let comment = '';

    if (type === 'down') {
      const prompt = await Swal.fire({
        title: 'O que pode melhorar?',
        input: 'textarea',
        inputPlaceholder: 'Descreva rapidamente o que não ajudou...',
        inputAttributes: {
          'aria-label': 'Descreva o feedback',
        },
        showCancelButton: true,
        confirmButtonText: 'Enviar feedback',
        cancelButtonText: 'Cancelar',
      });

      if (!prompt.isConfirmed) {
        return;
      }

      comment = String(prompt.value || '').trim();
    }

    setFeedbackByMessage((previous) => ({
      ...previous,
      [messageId]: {
        type,
        comment,
        ratedAt: new Date().toISOString(),
      },
    }));

    try {
      await api.post(
        'v1/ElohIA/feedback',
        buildConversationRequest({
          conversationId,
          messageId,
          feedbackType: type,
          comment,
        })
      );
    } catch (error) {
      console.error('Erro ao persistir feedback da IA:', error);
    }
  };

  const handleNewConversation = async () => {
    const nextConversationId = createConversationId();

    localStorage.setItem(CONVERSATION_STORAGE_KEY, nextConversationId);
    setMessages([]);
    setConversationId(nextConversationId);
    loadConversationList();
  };

  const handleSelectConversation = (nextConversationId) => {
    if (!nextConversationId || nextConversationId === conversationId) {
      return;
    }

    setConversationId(nextConversationId);
  };

  const handleDeleteConversation = async (targetConversationId) => {
    if (!targetConversationId || deletingConversationId) {
      return;
    }

    const confirmed = await Swal.fire({
      title: 'Excluir conversa?',
      text: 'Deseja realmente excluir esta conversa?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    });

    if (!confirmed.isConfirmed) {
      return;
    }

    setDeletingConversationId(targetConversationId);

    try {
      await api.post(
        'v1/ElohIA/limpar',
        buildConversationRequest({ conversationId: targetConversationId })
      );

      localStorage.removeItem(`${MESSAGES_STORAGE_PREFIX}${targetConversationId}`);

      const remainingConversations = conversations.filter(
        (conversation) => conversation.conversationId !== targetConversationId
      );

      setConversations(remainingConversations);

      if (targetConversationId === conversationId) {
        const fallbackConversationId = remainingConversations[0]?.conversationId || createConversationId();
        localStorage.setItem(CONVERSATION_STORAGE_KEY, fallbackConversationId);
        setConversationId(fallbackConversationId);

        if (!remainingConversations.length) {
          setMessages([]);
        }
      }

      await loadConversationList();
    } catch (error) {
      console.error('Erro ao excluir conversa:', error);
    } finally {
      setDeletingConversationId('');
    }
  };

  return (
    <>
      <Menu/>

      {sidebarOpen && (
        <div className="chat-sidebar-overlay" onClick={() => setSidebarOpen(false)} />
      )}

      <div className="chat-container">
        <div className="chat-layout">

          <aside className={`chat-sidebar${sidebarOpen ? ' chat-sidebar--open' : ''}`}>
            <div className="chat-sidebar-header">
              <span>Conversas</span>
              <button
                type="button"
                className="chat-sidebar-new-btn"
                onClick={handleNewConversation}
                disabled={loading}
              >
                + Nova
              </button>
            </div>

            {loadingConversations && (
              <div className="chat-sidebar-state">Carregando...</div>
            )}

            {!loadingConversations && conversations.length === 0 && (
              <div className="chat-sidebar-state">Nenhuma conversa registrada</div>
            )}

            {!loadingConversations && conversations.length > 0 && (
              <div className="chat-sidebar-list">
                {conversations.map((conversation) => (
                  <div
                    key={conversation.conversationId}
                    className={`chat-sidebar-item ${conversation.conversationId === conversationId ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="chat-sidebar-item-button"
                      onClick={() => handleSelectConversation(conversation.conversationId)}
                      disabled={deletingConversationId === conversation.conversationId}
                    >
                      <div className="chat-sidebar-item-title">
                        {conversation.preview || 'Conversa sem título'}
                      </div>
                      <div className="chat-sidebar-item-meta">
                        <span>{formatConversationDate(conversation.updatedAt)}</span>
                        <span>{conversation.totalMessages || 0} msgs</span>
                      </div>
                    </button>
                    <button
                      type="button"
                      className="chat-sidebar-delete-button"
                      onClick={() => handleDeleteConversation(conversation.conversationId)}
                      disabled={Boolean(deletingConversationId)}
                      title="Excluir conversa"
                      aria-label="Excluir conversa"
                    >
                      {deletingConversationId === conversation.conversationId ? '...' : '×'}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </aside>

          <div className="chat-box">
            <div className="chat-toolbar">
              <button
                type="button"
                className="chat-sidebar-toggle"
                onClick={() => setSidebarOpen((prev) => !prev)}
                aria-label="Abrir conversas"
              >
                <i className="bi bi-list" />
              </button>
              {messages.length > 0 && (
                <span className="chat-toolbar-logo-name">Eloah</span>
              )}
            </div>

            <div className="chat-messages">
              {messages.length === 0 && (
                <div className="chat-welcome">
                  <h1 className="chat-welcome-title">Eloah</h1>
                  <p className="chat-welcome-subtitle">Como posso te ajudar hoje?</p>
                </div>
              )}

              {messages.map((msg, index) => (
                <div key={msg.id || index}>
                  {msg.type === 'text' && (
                    <div className={`message-bubble-container ${msg.role === 'user' ? 'user' : 'ai'}`}>
                      <div className="message-sender">
                        {msg.role === 'user' ? 'Você:' : 'Eloah:'}
                      </div>
                      <div className={`message-bubble ${msg.role === 'user' ? 'user' : 'ai'}`}>
                        <div
                          className="message-content"
                          dangerouslySetInnerHTML={{ __html: md.render(String(msg.content ?? '')) }}
                        />
                      </div>
                      {msg.role === 'Eloh' && (
                        <div className="ia-message-actions">
                          <button
                            type="button"
                            className={`ia-feedback-btn ${feedbackByMessage[msg.id]?.type === 'up' ? 'active' : ''}`}
                            onClick={() => handleFeedbackResponse(msg.id, 'up')}
                            title="Resposta útil"
                          >
                            👍
                          </button>
                          <button
                            type="button"
                            className={`ia-feedback-btn ${feedbackByMessage[msg.id]?.type === 'down' ? 'active' : ''}`}
                            onClick={() => handleFeedbackResponse(msg.id, 'down')}
                            title="Precisa melhorar"
                          >
                            👎
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {msg.type === 'table-prompt' && !msg.showTable && (
                    <div
                      className="d-flex flex-column justify-content-center align-items-center text-center"
                      style={{ minHeight: '300px' }}
                    >
                      <div className="mb-4">
                        <h5 className="fw-bold">Eloh gerou uma tabela com base na sua pergunta</h5>
                        <p className="text-muted">O que você gostaria de fazer com os dados?</p>
                      </div>
                      <div className="d-flex gap-3 flex-wrap justify-content-center">
                        <button className="btn btn-primary" onClick={() => handleShowTable(index)}>
                          👀 Visualizar Tabela
                        </button>
                        <button className="btn btn-outline-success" onClick={() => exportToExcel(msg.rawData)}>
                          📥 Baixar Excel
                        </button>
                      </div>
                    </div>
                  )}

                  {msg.type === 'table-prompt' && msg.showTable && (
                    <div className="mt-3">
                      <div className="mb-2 text-start">
                        <button className="btn btn-outline-success btn-sm" onClick={() => exportToExcel(msg.rawData)}>
                          📥 Exportar Excel
                        </button>
                      </div>
                      <div dangerouslySetInnerHTML={{ __html: msg.table }} />
                    </div>
                  )}

                  {msg.type === 'dashboard' && (
                    <div className="message-bubble-container ai">
                      <div className="message-sender">Eloah:</div>
                      <div className="message-bubble ai dashboard-bubble-full">
                        <div className="mt-4">
                          <Dashboard dashboard={msg.dashboard} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="typing-text">
                  <span className="spinner" /> Eloh está analisando...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-area p-2 mb-3">
              {messages.some((message) => message.role === 'user') && relatedQuestions.length > 0 && (
                <div className="ia-suggestions-wrap w-100 mb-2">
                  <div className="ia-suggestions-label">Perguntas relacionadas</div>
                  <div className="ia-suggestions-list">
                    {relatedQuestions.map((suggestion) => (
                      <button
                        key={`related-${suggestion}`}
                        type="button"
                        className="ia-suggestion-chip"
                        onClick={() => handleUseSuggestion(suggestion)}
                        disabled={loading}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="chat-input-box">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  className="chat-input-textarea"
                  placeholder="Pergunte à Eloah..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
                <div className="chat-input-actions">
                  <button
                    type="button"
                    className={`chat-send-btn ${input.trim() && !loading ? 'active' : ''}`}
                    onClick={() => handleSend()}
                    disabled={loading || !input.trim()}
                    aria-label="Enviar mensagem"
                  >
                    {loading
                      ? <span className="chat-send-spinner" />
                      : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                          <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )
                    }
                  </button>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default IaEloh;
