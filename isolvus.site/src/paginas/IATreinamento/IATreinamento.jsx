import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import Menu from '../../componentes/Menu/Menu';
import api from '../../servidor/api.jsx';
import './IATreinamento.css';

const AGENT_TYPES = [
  { value: 'SQL', label: 'Agente SQL' },
];

const emptyTableForm = {
  id: null,
  name: '',
  businessName: '',
  description: '',
  columns: '',
  relationships: '',
  notes: '',
};

const emptyAgentForm = {
  id: null,
  type: 'SQL',
  name: '',
  rules: '',
  tables: [],
};

const emptyColumnRow = {
  name: '',
  type: '',
  nullable: 'NULL',
  comment: '',
};

const emptyRelationshipRow = {
  originTable: '',
  originColumn: '',
  targetTable: '',
  targetColumn: '',
};

function parseColumnsText(columnsText = '') {
  return String(columnsText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [definitionPart, ...commentParts] = line.split(' - ');
      const comment = commentParts.join(' - ').trim();
      const tokens = definitionPart.trim().split(/\s+/);
      const name = tokens.shift() || '';
      let nullable = 'NULL';

      if (tokens.slice(-2).join(' ').toUpperCase() === 'NOT NULL') {
        nullable = 'NOT NULL';
        tokens.splice(-2, 2);
      } else if (tokens.slice(-1).join(' ').toUpperCase() === 'NULL') {
        nullable = 'NULL';
        tokens.splice(-1, 1);
      }

      return {
        name,
        type: tokens.join(' '),
        nullable,
        comment,
      };
    });
}

function serializeColumnsRows(rows = []) {
  return (rows || [])
    .map((row) => ({
      name: String(row.name || '').trim().toUpperCase(),
      type: String(row.type || '').trim().toUpperCase(),
      nullable: String(row.nullable || 'NULL').trim().toUpperCase(),
      comment: String(row.comment || '').trim(),
    }))
    .filter((row) => row.name && row.type)
    .map((row) => `${row.name} ${row.type} ${row.nullable}${row.comment ? ` - ${row.comment}` : ''}`)
    .join('\n');
}

function parseRelationshipEndpoint(endpoint = '') {
  const normalizedEndpoint = String(endpoint || '').trim().toUpperCase();

  if (!normalizedEndpoint) {
    return { table: '', column: '' };
  }

  const lastDotIndex = normalizedEndpoint.lastIndexOf('.');
  if (lastDotIndex <= 0 || lastDotIndex === normalizedEndpoint.length - 1) {
    return { table: normalizedEndpoint, column: '' };
  }

  return {
    table: normalizedEndpoint.slice(0, lastDotIndex),
    column: normalizedEndpoint.slice(lastDotIndex + 1),
  };
}

function getColumnNamesFromText(columnsText = '') {
  return parseColumnsText(columnsText)
    .map((row) => String(row.name || '').trim().toUpperCase())
    .filter(Boolean);
}

function parseRelationshipRows(relationshipsText = '') {
  return String(relationshipsText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [origin = '', target = ''] = line.split('->').map((part) => part.trim());
      const originParsed = parseRelationshipEndpoint(origin);
      const targetParsed = parseRelationshipEndpoint(target);

      return {
        originTable: originParsed.table,
        originColumn: originParsed.column,
        targetTable: targetParsed.table,
        targetColumn: targetParsed.column,
      };
    });
}

function serializeRelationshipRows(rows = []) {
  return (rows || [])
    .map((row) => ({
      originTable: String(row.originTable || '').trim().toUpperCase(),
      originColumn: String(row.originColumn || '').trim().toUpperCase(),
      targetTable: String(row.targetTable || '').trim().toUpperCase(),
      targetColumn: String(row.targetColumn || '').trim().toUpperCase(),
    }))
    .filter((row) => row.originTable && row.originColumn && row.targetTable && row.targetColumn)
    .map((row) => `${row.originTable}.${row.originColumn} -> ${row.targetTable}.${row.targetColumn}`)
    .join('\n');
}

function mapTableFromApi(table) {
  return {
    id: table.id_agente_tabela || null,
    name: table.nome_tabela || '',
    businessName: table.nome_negocio || '',
    description: table.descricao || '',
    columns: table.colunas_def || '',
    relationships: table.relacionamentos || '',
    notes: table.observacoes || '',
  };
}

function IATreinamento() {
  const [loading, setLoading] = useState(false);
  const [savingModal, setSavingModal] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [agents, setAgents] = useState([]);
  const [agentForm, setAgentForm] = useState(emptyAgentForm);
  const [tableForm, setTableForm] = useState(emptyTableForm);
  const [editingTableIndex, setEditingTableIndex] = useState(null);
  const [tableSuggestions, setTableSuggestions] = useState([]);
  const [searchingTables, setSearchingTables] = useState(false);
  const [loadingDbMetadata, setLoadingDbMetadata] = useState(false);
  const [loadedMetadataTable, setLoadedMetadataTable] = useState('');
  const [isTableInputFocused, setIsTableInputFocused] = useState(false);
  const [tableSearchError, setTableSearchError] = useState('');
  const [columnRows, setColumnRows] = useState([]);
  const [relationshipRows, setRelationshipRows] = useState([]);
  const [columnPicker, setColumnPicker] = useState(null); // { metadata, allColumns, selected: Set }

  const availableRelationshipTables = (() => {
    const tablesMap = new Map();

    agentForm.tables.forEach((table) => {
      const normalizedName = String(table.name || '').trim().toUpperCase();
      if (!normalizedName) {
        return;
      }

      tablesMap.set(normalizedName, {
        name: normalizedName,
        businessName: String(table.businessName || '').trim(),
        columns: getColumnNamesFromText(table.columns || ''),
      });
    });

    const currentTableName = String(tableForm.name || '').trim().toUpperCase();
    if (currentTableName) {
      tablesMap.set(currentTableName, {
        name: currentTableName,
        businessName: String(tableForm.businessName || '').trim(),
        columns: columnRows
          .map((row) => String(row.name || '').trim().toUpperCase())
          .filter(Boolean),
      });
    }

    return Array.from(tablesMap.values());
  })();

  const payloadBase = {
    id_usuario: Number(localStorage.getItem('id_usuario')) || 0,
    id_grupo_empresa: Number(localStorage.getItem('id_grupo_empresa')) || 0,
  };

  async function loadAgents() {
    try {
      setLoading(true);
      const results = await Promise.all(AGENT_TYPES.map(async (typeOption) => {
        const response = await api.post('/v1/ElohIA/agente-sql/config/listar', {
          ...payloadBase,
          tipoAgente: typeOption.value,
          searchTerm: '',
          tabela: '',
          onlyActive: false,
          limit: 200,
        });

        return {
          type: typeOption.value,
          label: typeOption.label,
          agent: response.data?.agent || null,
          tables: response.data?.tables || [],
        };
      }));

      const mappedAgents = results
        .filter((item) => item.agent)
        .map((item) => ({
          id: item.agent.id_agente,
          type: item.type,
          typeLabel: item.label,
          name: item.agent.nome_agente,
          rules: item.agent.regras_gerais || '',
          tablesCount: item.tables.length,
        }));

      setAgents(mappedAgents);
    } catch (error) {
      Swal.fire('Erro', 'Não foi possível carregar os agentes.', 'error');
    } finally {
      setLoading(false);
    }
  }

  async function loadAgentDetails(type) {
    const response = await api.post('/v1/ElohIA/agente-sql/config/listar', {
      ...payloadBase,
      tipoAgente: type,
      searchTerm: '',
      tabela: '',
      onlyActive: false,
      limit: 200,
    });

    const agent = response.data?.agent || null;
    const tables = response.data?.tables || [];

    if (!agent) {
      return {
        ...emptyAgentForm,
        type,
      };
    }

    return {
      id: agent.id_agente,
      type,
      name: agent.nome_agente || '',
      rules: agent.regras_gerais || '',
      tables: tables.map(mapTableFromApi),
    };
  }

  useEffect(() => {
    loadAgents();
  }, []);

  useEffect(() => {
    if (!showModal) {
      return;
    }

    const tableTerm = String(tableForm.name || '').trim();

    if (!tableTerm) {
      setTableSuggestions([]);
      setTableSearchError('');
      return;
    }

    const timeoutId = setTimeout(async () => {
      try {
        setSearchingTables(true);

        const response = await api.post('/v1/ElohIA/agente-sql/db/tabelas', {
          ...payloadBase,
          searchTerm: tableTerm,
          limit: 15,
        });

        setTableSuggestions(response.data?.tables || []);
        setTableSearchError('');
      } catch (error) {
        setTableSuggestions([]);
        setTableSearchError(error?.response?.data?.detalhes || 'Não foi possível buscar tabelas no banco.');
      } finally {
        setSearchingTables(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [showModal, tableForm.name]);

  useEffect(() => {
    const normalizedTable = String(tableForm.name || '').trim().toUpperCase();

    if (!normalizedTable) {
      setLoadedMetadataTable('');
      return;
    }

    if (loadedMetadataTable && loadedMetadataTable !== normalizedTable) {
      setLoadedMetadataTable('');
    }

    const hasExactSuggestion = tableSuggestions.some(
      (item) => String(item.tableName || '').toUpperCase() === normalizedTable
    );

    if (hasExactSuggestion && loadedMetadataTable !== normalizedTable && !loadingDbMetadata) {
      loadTableMetadataFromDatabase(normalizedTable);
    }
  }, [tableForm.name, tableSuggestions, loadedMetadataTable, loadingDbMetadata]);

  useEffect(() => {
    setTableForm((previous) => {
      const nextColumns = serializeColumnsRows(columnRows);

      if (previous.columns === nextColumns) {
        return previous;
      }

      return {
        ...previous,
        columns: nextColumns,
      };
    });
  }, [columnRows]);

  async function openAddModal() {
    setAgentForm(emptyAgentForm);
    setTableForm(emptyTableForm);
    setEditingTableIndex(null);
    setShowModal(true);
  }

  async function openEditModal(type) {
    try {
      setLoading(true);
      const details = await loadAgentDetails(type);
      setAgentForm(details);
      setTableForm(emptyTableForm);
      setEditingTableIndex(null);
      setShowModal(true);
    } catch (error) {
      Swal.fire('Erro', 'Não foi possível carregar os detalhes do agente.', 'error');
    } finally {
      setLoading(false);
    }
  }

  function closeModal() {
    setShowModal(false);
    setAgentForm(emptyAgentForm);
    setTableForm(emptyTableForm);
    setEditingTableIndex(null);
  }

  function resetTableEditor() {
    setTableForm(emptyTableForm);
    setColumnRows([]);
    setRelationshipRows([]);
    setEditingTableIndex(null);
    setTableSuggestions([]);
    setLoadedMetadataTable('');
    setIsTableInputFocused(false);
    setTableSearchError('');
  }

  function handleSelectTableSuggestion(tableName) {
    const normalizedName = String(tableName || '').trim().toUpperCase();
    setTableForm((previous) => ({ ...previous, name: normalizedName }));
    setIsTableInputFocused(false);
  }

  async function loadTableMetadataFromDatabase(selectedTableName) {
    const normalizedName = String(selectedTableName || '').trim().toUpperCase();

    if (!normalizedName) {
      Swal.fire('Tabela obrigatória', 'Informe o nome da tabela para buscar no banco.', 'warning');
      return;
    }

    try {
      setLoadingDbMetadata(true);

      const response = await api.post('/v1/ElohIA/agente-sql/db/tabela-detalhes', {
        ...payloadBase,
        tableName: normalizedName,
      });

      const metadata = response.data?.metadata;

      if (!metadata) {
        Swal.fire('Sem dados', 'Não foi possível obter metadados da tabela informada.', 'warning');
        return;
      }

      const allColumns = parseColumnsText(metadata.columnsText || '');
      setLoadedMetadataTable(metadata.tableName || normalizedName);
      setColumnPicker({
        metadata,
        allColumns,
        selected: new Set(allColumns.map((_, i) => i)),
      });
    } catch (error) {
      Swal.fire('Erro', error?.response?.data?.detalhes || 'Não foi possível carregar os dados da tabela.', 'error');
    } finally {
      setLoadingDbMetadata(false);
    }
  }

  function confirmColumnPicker() {
    if (!columnPicker) return;
    const { metadata, allColumns, selected } = columnPicker;
    const filteredColumns = allColumns.filter((_, i) => selected.has(i));
    const filteredColumnsText = serializeColumnsRows(filteredColumns);
    setTableForm((previous) => ({
      ...previous,
      name: metadata.tableName || previous.name,
      businessName: metadata.businessName || previous.businessName,
      description: metadata.description || previous.description,
      columns: filteredColumnsText,
      relationships: metadata.relationshipsText || previous.relationships,
      notes: previous.notes,
    }));
    setColumnRows(filteredColumns);
    setRelationshipRows(parseRelationshipRows(metadata.relationshipsText || ''));
    setLoadedMetadataTable(metadata.tableName || '');
    setColumnPicker(null);
  }

  function toggleColumnPickerItem(index) {
    setColumnPicker((previous) => {
      const next = new Set(previous.selected);
      if (next.has(index)) { next.delete(index); } else { next.add(index); }
      return { ...previous, selected: next };
    });
  }

  function toggleAllColumnPicker(selectAll) {
    setColumnPicker((previous) => ({
      ...previous,
      selected: selectAll ? new Set(previous.allColumns.map((_, i) => i)) : new Set(),
    }));
  }

  function addOrUpdateTableInModal() {
    const serializedColumns = serializeColumnsRows(columnRows);
    const serializedRelationships = serializeRelationshipRows(relationshipRows);

    if (!tableForm.name.trim() || !serializedColumns.trim()) {
      Swal.fire('Dados obrigatórios', 'Informe nome da tabela e colunas.', 'warning');
      return;
    }

    const normalizedName = tableForm.name.trim().toUpperCase();
    const hasExactSuggestion = tableSuggestions.some(
      (item) => String(item.tableName || '').toUpperCase() === normalizedName
    );
    const isValidatedByMetadata = String(loadedMetadataTable || '').trim().toUpperCase() === normalizedName;

    if (!hasExactSuggestion && !isValidatedByMetadata && !tableForm.id) {
      Swal.fire('Tabela inválida', 'Selecione uma tabela existente no banco (autocomplete).', 'warning');
      return;
    }

    if (!isValidatedByMetadata) {
      Swal.fire('Metadados pendentes', 'Aguarde o carregamento automático ou clique em "Trazer dados da tabela do banco".', 'warning');
      return;
    }

    const parsed = {
      ...tableForm,
      name: normalizedName,
      businessName: tableForm.businessName.trim(),
      description: tableForm.description.trim(),
      columns: serializedColumns,
      relationships: serializedRelationships,
      notes: tableForm.notes.trim(),
    };

    setAgentForm((previous) => {
      const alreadyIndex = previous.tables.findIndex((item, index) => {
        if (editingTableIndex === index) {
          return false;
        }

        return String(item.name || '').toUpperCase() === parsed.name;
      });

      if (alreadyIndex >= 0) {
        Swal.fire('Tabela repetida', 'Já existe uma tabela com esse nome no agente.', 'warning');
        return previous;
      }

      if (editingTableIndex !== null && editingTableIndex >= 0) {
        const nextTables = [...previous.tables];
        nextTables[editingTableIndex] = parsed;
        return { ...previous, tables: nextTables };
      }

      return { ...previous, tables: [...previous.tables, parsed] };
    });

    resetTableEditor();
  }

  function editTableInModal(index) {
    const row = agentForm.tables[index];
    if (!row) {
      return;
    }

    setTableForm(row);
    setColumnRows(parseColumnsText(row.columns || ''));
  setRelationshipRows(parseRelationshipRows(row.relationships || ''));
    setEditingTableIndex(index);
    setTableSuggestions([]);
    setLoadedMetadataTable(String(row.name || '').trim().toUpperCase());
    setIsTableInputFocused(false);
    setTableSearchError('');
  }

  function handleColumnRowChange(index, field, value) {
    setColumnRows((previous) => previous.map((row, rowIndex) => (
      rowIndex === index ? { ...row, [field]: field === 'name' || field === 'type' ? value.toUpperCase() : value } : row
    )));
  }

  function handleAddColumnRow() {
    setColumnRows((previous) => [...previous, { ...emptyColumnRow }]);
  }

  function handleRemoveColumnRow(index) {
    setColumnRows((previous) => previous.filter((_, rowIndex) => rowIndex !== index));
  }

  function handleRelationshipRowChange(index, field, value) {
    setRelationshipRows((previous) => previous.map((row, rowIndex) => {
      if (rowIndex !== index) {
        return row;
      }

      const normalizedValue = value.toUpperCase();

      if (field === 'originTable') {
        return {
          ...row,
          originTable: normalizedValue,
          originColumn: '',
          targetTable: row.targetTable === normalizedValue ? '' : row.targetTable,
          targetColumn: row.targetTable === normalizedValue ? '' : row.targetColumn,
        };
      }

      if (field === 'targetTable') {
        return {
          ...row,
          targetTable: normalizedValue,
          targetColumn: '',
          originTable: row.originTable === normalizedValue ? '' : row.originTable,
          originColumn: row.originTable === normalizedValue ? '' : row.originColumn,
        };
      }

      return { ...row, [field]: normalizedValue };
    }));
  }

  function handleAddRelationshipRow() {
    const currentTableName = String(tableForm.name || '').trim().toUpperCase();

    setRelationshipRows((previous) => [
      ...previous,
      {
        ...emptyRelationshipRow,
        originTable: currentTableName,
      },
    ]);
  }

  function handleRemoveRelationshipRow(index) {
    setRelationshipRows((previous) => previous.filter((_, rowIndex) => rowIndex !== index));
  }

  async function removeTableInModal(index) {
    const row = agentForm.tables[index];
    if (!row) {
      return;
    }

    const confirmacao = await Swal.fire({
      title: 'Remover tabela?',
      text: `Deseja remover a tabela ${row.name || ''}?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sim, remover',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc3545',
    });

    if (!confirmacao.isConfirmed) {
      return;
    }

    try {
      if (row.id) {
        await api.post('/v1/ElohIA/agente-sql/tabela/remover', {
          ...payloadBase,
          id: row.id,
        });
      }

      setAgentForm((previous) => ({
        ...previous,
        tables: previous.tables.filter((_, itemIndex) => itemIndex !== index),
      }));

      if (editingTableIndex === index) {
        resetTableEditor();
      } else if (editingTableIndex !== null && editingTableIndex > index) {
        setEditingTableIndex((previous) => previous - 1);
      }

      await Swal.fire('Sucesso', 'Tabela removida com sucesso.', 'success');
    } catch (error) {
      Swal.fire('Erro', error?.response?.data?.detalhes || 'Não foi possível remover a tabela.', 'error');
    }
  }

  async function saveAgentFromModal() {
    if (!agentForm.name.trim()) {
      Swal.fire('Nome obrigatório', 'Informe o nome do agente.', 'warning');
      return;
    }

    if (!agentForm.rules.trim()) {
      Swal.fire('Regra obrigatória', 'Informe a regra geral do agente.', 'warning');
      return;
    }

    try {
      setSavingModal(true);

      const saveResponse = await api.post('/v1/ElohIA/agente-sql/config/salvar', {
        ...payloadBase,
        id_agente: agentForm.id,
        tipoAgente: agentForm.type,
        nomeAgente: agentForm.name.trim(),
        regrasGerais: agentForm.rules.trim(),
        tabelas: agentForm.tables.map((table) => ({
          id: table.id,
          name: table.name,
          businessName: table.businessName,
          description: table.description,
          columns: table.columns,
          relationships: table.relationships,
          notes: table.notes,
          active: true,
        })),
        ativo: true,
      });

      const savedAgentId = saveResponse.data?.result?.agentId;

      await Swal.fire('Sucesso', savedAgentId ? 'Agente salvo com sucesso.' : 'Alterações salvas.', 'success');
      closeModal();
      await loadAgents();
    } catch (error) {
      Swal.fire('Erro', error?.response?.data?.detalhes || 'Não foi possível salvar o agente.', 'error');
    } finally {
      setSavingModal(false);
    }
  }

  return (
    <>
      <Menu />

      <div className="container-fluid Containe-Tela ia-training-page">
        <div className="row text-body-secondary mb-3">
          <div className="col-12 d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div>
              <h1 className="mb-1 titulo-da-pagina">Consulta de Agentes</h1>
              <p className="ia-training-subtitle mb-0">Consulte os agentes cadastrados e clique em adicionar para configurar regras, tabelas e colunas.</p>
            </div>
            <button type="button" className="btn btn-primary" onClick={openAddModal}>
              Adicionar agente
            </button>
          </div>
        </div>

        <div className="card shadow-sm ia-training-card">
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-hover align-middle">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Nome do agente</th>
                    <th>Qtd. tabelas</th>
                    <th className="text-end">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && (
                    <tr>
                      <td colSpan={4} className="text-center py-4">Carregando agentes...</td>
                    </tr>
                  )}

                  {!loading && agents.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-4">Nenhum agente cadastrado.</td>
                    </tr>
                  )}

                  {!loading && agents.map((agent) => (
                    <tr key={agent.id}>
                      <td>{agent.typeLabel}</td>
                      <td>{agent.name}</td>
                      <td>{agent.tablesCount}</td>
                      <td className="text-end">
                        <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openEditModal(agent.type)}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {showModal && (
          <>
            <div className="modal fade show ia-agent-modal-open" tabIndex="-1" role="dialog" aria-modal="true">
              <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable ia-agent-modal-dialog" role="document">
                <div className="modal-content ia-agent-modal-content">
                  <div className="modal-header ia-agent-modal-header">
                    <div className="d-flex justify-content-between align-items-center w-100 gap-3 flex-wrap">
                      <div>
                        <h4 className="mb-1 ia-agent-modal-title">{agentForm.id ? 'Editar Agente' : 'Adicionar Agente'}</h4>
                        <p className="mb-0 text-muted ia-agent-modal-subtitle">
                          Configure as regras, tabelas, colunas e relacionamentos do agente.
                        </p>
                      </div>
                      <button type="button" className="btn btn-outline-secondary" onClick={closeModal}>Fechar</button>
                    </div>
                  </div>

                  <div className="modal-body">
                    <div className="row g-3 mb-3">
                      <div className="col-md-3">
                        <label className="form-label">Tipo</label>
                        <select
                          className="form-select"
                          value={agentForm.type}
                          onChange={(event) => setAgentForm((previous) => ({ ...previous, type: event.target.value }))}
                        >
                          {AGENT_TYPES.map((item) => (
                            <option key={item.value} value={item.value}>{item.label}</option>
                          ))}
                        </select>
                      </div>

                      <div className="col-md-9">
                        <label className="form-label">Nome do agente</label>
                        <input
                          className="form-control"
                          value={agentForm.name}
                          onChange={(event) => setAgentForm((previous) => ({ ...previous, name: event.target.value }))}
                          maxLength={120}
                        />
                      </div>

                      <div className="col-12">
                        <label className="form-label">Regras gerais</label>
                        <textarea
                          className="form-control"
                          rows={8}
                          value={agentForm.rules}
                          onChange={(event) => setAgentForm((previous) => ({ ...previous, rules: event.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="card border-0 bg-light p-3 mb-3">
                      <h6 className="mb-3">Tabelas do agente</h6>

                      <div className="row g-2">
                        <div className="col-md-4">
                          <label className="form-label">Nome da tabela</label>
                          <div className="ia-table-autocomplete">
                            <input
                              className="form-control"
                              value={tableForm.name}
                              onFocus={() => setIsTableInputFocused(true)}
                              onBlur={() => setTimeout(() => setIsTableInputFocused(false), 120)}
                              onChange={(event) => {
                                setIsTableInputFocused(true);
                                setTableForm((previous) => ({ ...previous, name: event.target.value.toUpperCase() }));
                              }}
                            />

                            {isTableInputFocused && tableForm.name.trim() && tableSuggestions.length > 0 && (
                              <div className="ia-table-autocomplete-list">
                                {tableSuggestions.map((item) => {
                                  const alreadyAdded = agentForm.tables.some(
                                    (t) => String(t.name || '').toUpperCase() === String(item.tableName || '').toUpperCase()
                                  );
                                  return (
                                    <button
                                      type="button"
                                      key={item.tableName}
                                      className="ia-table-autocomplete-item"
                                      onClick={() => handleSelectTableSuggestion(item.tableName)}
                                    >
                                      <div className="d-flex align-items-center gap-2 w-100">
                                        <div className="flex-grow-1 overflow-hidden">
                                          <span className="ia-table-autocomplete-name">{item.tableName}</span>
                                          {item.businessName && (
                                            <span className="ia-table-autocomplete-business d-block">{item.businessName}</span>
                                          )}
                                        </div>
                                        {alreadyAdded && (
                                          <span className="badge bg-success flex-shrink-0">Já adicionada</span>
                                        )}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                          <div className="form-text">
                            Digite para buscar no banco em tempo real.
                            {searchingTables ? ' Buscando tabelas...' : ''}
                            {!searchingTables && !tableSearchError && tableForm.name.trim() && tableSuggestions.length === 0 ? ' Nenhuma tabela encontrada para esse termo.' : ''}
                          </div>
                          {tableSearchError && <div className="text-danger small mt-1">{tableSearchError}</div>}
                          <button
                            type="button"
                            className="btn btn-sm btn-outline-dark mt-2"
                            onClick={() => loadTableMetadataFromDatabase(tableForm.name)}
                            disabled={loadingDbMetadata}
                          >
                            {loadingDbMetadata ? 'Carregando metadados...' : 'Trazer dados da tabela do banco'}
                          </button>
                        </div>

                        <div className="col-md-8">
                          <label className="form-label">Nome de negócio</label>
                          <input
                            className="form-control"
                            value={tableForm.businessName}
                            onChange={(event) => setTableForm((previous) => ({ ...previous, businessName: event.target.value }))}
                          />
                          <div className="form-text">Nome amigável para o usuário final (ex.: "Pedidos", "Clientes").</div>
                        </div>

                        <div className="col-12">
                          <label className="form-label">Descrição</label>
                          <input
                            className="form-control"
                            value={tableForm.description}
                            onChange={(event) => setTableForm((previous) => ({ ...previous, description: event.target.value }))}
                          />
                          <div className="form-text">Resumo do que a tabela representa no processo de negócio.</div>
                        </div>

                        <div className="col-12">
                          <label className="form-label">Colunas</label>
                          <div className="table-responsive ia-columns-grid-wrap">
                            <table className="table table-sm align-middle ia-columns-grid mb-2">
                              <thead>
                                <tr>
                                  <th>Nome</th>
                                  <th>Tipo</th>
                                  <th>Nulável</th>
                                  <th>Comentário</th>
                                </tr>
                              </thead>
                              <tbody>
                                {columnRows.length === 0 && (
                                  <tr>
                                    <td colSpan={4} className="text-center py-3">Nenhuma coluna carregada.</td>
                                  </tr>
                                )}

                                {columnRows.map((columnRow, index) => (
                                  <tr key={`column-row-${index}`}>
                                    <td>
                                      <input
                                        className="form-control form-control-sm"
                                        value={columnRow.name}
                                        onChange={(event) => handleColumnRowChange(index, 'name', event.target.value)}
                                        disabled
                                      />
                                    </td>
                                    <td>
                                      <input
                                        className="form-control form-control-sm"
                                        value={columnRow.type}
                                        onChange={(event) => handleColumnRowChange(index, 'type', event.target.value)}
                                        disabled
                                      />
                                    </td>
                                    <td>
                                      <select
                                        className="form-select form-select-sm"
                                        value={columnRow.nullable}
                                        onChange={(event) => handleColumnRowChange(index, 'nullable', event.target.value)}
                                        disabled
                                      >
                                        <option value="NULL">NULL</option>
                                        <option value="NOT NULL">NOT NULL</option>
                                      </select>
                                    </td>
                                    <td>
                                      <input
                                        className="form-control form-control-sm"
                                        value={columnRow.comment}
                                        onChange={(event) => handleColumnRowChange(index, 'comment', event.target.value)}
                                      />
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        <div className="col-12">
                          <label className="form-label">Relacionamentos</label>
                          <div className="form-text mb-2">Selecione as tabelas do agente e as colunas de origem e destino.</div>
                          <div className="table-responsive ia-columns-grid-wrap mb-2">
                            <table className="table table-sm align-middle ia-columns-grid mb-2" style={{ tableLayout: 'fixed', width: '100%' }}>
                              <thead>
                                <tr>
                                  <th style={{ width: '26%' }}>Tabela origem</th>
                                  <th style={{ width: '26%' }}>Coluna origem</th>
                                  <th style={{ width: '26%' }}>Tabela destino</th>
                                  <th style={{ width: '26%' }}>Coluna destino</th>
                                  <th className="text-end ia-action-header">Ações</th>
                                </tr>
                              </thead>
                              <tbody>
                                {relationshipRows.length === 0 && (
                                  <tr>
                                    <td colSpan={5} className="text-center py-3">Nenhum relacionamento carregado.</td>
                                  </tr>
                                )}

                                {relationshipRows.map((relationshipRow, index) => {
                                  const originColumns = availableRelationshipTables.find((item) => item.name === relationshipRow.originTable)?.columns || [];
                                  const targetColumns = availableRelationshipTables.find((item) => item.name === relationshipRow.targetTable)?.columns || [];
                                  const originTableOptions = availableRelationshipTables.filter((item) => item.name !== relationshipRow.targetTable);
                                  const targetTableOptions = availableRelationshipTables.filter((item) => item.name !== relationshipRow.originTable);

                                  return (
                                    <tr key={`relationship-row-${index}`}>
                                      <td>
                                        <select
                                          className="form-select form-select-sm"
                                          value={relationshipRow.originTable}
                                          onChange={(event) => handleRelationshipRowChange(index, 'originTable', event.target.value)}
                                        >
                                          <option value="">Selecione</option>
                                          {originTableOptions.map((tableOption) => (
                                            <option key={`origin-table-${tableOption.name}`} value={tableOption.name}>
                                              {tableOption.name}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td>
                                        <select
                                          className="form-select form-select-sm"
                                          value={relationshipRow.originColumn}
                                          onChange={(event) => handleRelationshipRowChange(index, 'originColumn', event.target.value)}
                                          disabled={!relationshipRow.originTable}
                                        >
                                          <option value="">Selecione</option>
                                          {originColumns.map((columnName) => (
                                            <option key={`origin-column-${relationshipRow.originTable}-${columnName}`} value={columnName}>
                                              {columnName}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td>
                                        <select
                                          className="form-select form-select-sm"
                                          value={relationshipRow.targetTable}
                                          onChange={(event) => handleRelationshipRowChange(index, 'targetTable', event.target.value)}
                                        >
                                          <option value="">Selecione</option>
                                          {targetTableOptions.map((tableOption) => (
                                            <option key={`target-table-${tableOption.name}`} value={tableOption.name}>
                                              {tableOption.name}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td>
                                        <select
                                          className="form-select form-select-sm"
                                          value={relationshipRow.targetColumn}
                                          onChange={(event) => handleRelationshipRowChange(index, 'targetColumn', event.target.value)}
                                          disabled={!relationshipRow.targetTable}
                                        >
                                          <option value="">Selecione</option>
                                          {targetColumns.map((columnName) => (
                                            <option key={`target-column-${relationshipRow.targetTable}-${columnName}`} value={columnName}>
                                              {columnName}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td className="text-end ia-action-cell">
                                        <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => handleRemoveRelationshipRow(index)}>
                                          Remover
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <button type="button" className="btn btn-sm btn-outline-secondary mb-3" onClick={handleAddRelationshipRow}>
                            Adicionar relacionamento
                          </button>
                        </div>

                        <div className="col-12">
                          <label className="form-label">Observações</label>
                          <textarea
                            className="form-control"
                            rows={8}
                            value={tableForm.notes}
                            onChange={(event) => setTableForm((previous) => ({ ...previous, notes: event.target.value }))}
                          />
                        </div>
                      </div>

                      <div className="d-flex gap-2 mt-3">
                        <button type="button" className="btn btn-outline-primary" onClick={addOrUpdateTableInModal}>
                          {editingTableIndex !== null ? 'Atualizar tabela' : 'Adicionar tabela'}
                        </button>
                        <button type="button" className="btn btn-outline-secondary" onClick={resetTableEditor}>
                          Limpar
                        </button>
                      </div>
                    </div>

                    <div className="table-responsive">
                      <table className="table table-sm table-striped align-middle">
                        <thead>
                          <tr>
                            <th>Tabela</th>
                            <th>Negócio</th>
                            <th>Descrição</th>
                            <th className="text-end">Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {agentForm.tables.length === 0 && (
                            <tr>
                              <td colSpan={4} className="text-center py-3">Nenhuma tabela adicionada.</td>
                            </tr>
                          )}

                          {agentForm.tables.map((table, index) => (
                            <tr key={`${table.name}-${index}`}>
                              <td>{table.name}</td>
                              <td>{table.businessName || '-'}</td>
                              <td>{table.description || '-'}</td>
                              <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                                <button type="button" className="btn btn-sm btn-outline-primary me-2" onClick={() => editTableInModal(index)}>
                                  Editar
                                </button>
                                <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => removeTableInModal(index)}>
                                  Remover
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancelar</button>
                    <button type="button" className="btn btn-danger" onClick={saveAgentFromModal} disabled={savingModal}>
                      {savingModal ? 'Salvando...' : 'Salvar agente'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {columnPicker && (
          <>
            <div className="modal-backdrop fade show" style={{ zIndex: 1060 }} />
            <div className="modal fade show d-block" style={{ zIndex: 1065 }}>
              <div className="modal-dialog modal-lg modal-dialog-scrollable">
                <div className="modal-content">
                  <div className="modal-header">
                    <h5 className="modal-title">Selecionar colunas — {columnPicker.metadata.tableName}</h5>
                  </div>
                  <div className="modal-body">
                    <p className="text-muted small mb-2">
                      {columnPicker.allColumns.length} colunas encontradas. Selecione apenas as que a IA precisará conhecer.
                    </p>
                    <div className="d-flex gap-2 mb-3">
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => toggleAllColumnPicker(true)}>Selecionar todas</button>
                      <button type="button" className="btn btn-sm btn-outline-secondary" onClick={() => toggleAllColumnPicker(false)}>Desmarcar todas</button>
                      <span className="ms-auto small text-muted align-self-center">
                        {columnPicker.selected.size} de {columnPicker.allColumns.length} selecionadas
                      </span>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-sm table-hover align-middle">
                        <thead>
                          <tr>
                            <th style={{ width: 40 }}></th>
                            <th>Nome</th>
                            <th>Tipo</th>
                            <th>Nulável</th>
                            <th>Comentário</th>
                          </tr>
                        </thead>
                        <tbody>
                          {columnPicker.allColumns.map((col, index) => (
                            <tr
                              key={index}
                              className={columnPicker.selected.has(index) ? '' : 'table-light text-muted'}
                              onClick={() => toggleColumnPickerItem(index)}
                              style={{ cursor: 'pointer' }}
                            >
                              <td>
                                <input
                                  type="checkbox"
                                  className="form-check-input"
                                  checked={columnPicker.selected.has(index)}
                                  onChange={() => toggleColumnPickerItem(index)}
                                  onClick={(e) => e.stopPropagation()}
                                />
                              </td>
                              <td><code>{col.name}</code></td>
                              <td>{col.type}</td>
                              <td>{col.nullable}</td>
                              <td>{col.comment || <span className="text-muted">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={() => { setColumnPicker(null); }}>Cancelar</button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={confirmColumnPicker}
                      disabled={columnPicker.selected.size === 0}
                    >
                      Confirmar seleção ({columnPicker.selected.size} colunas)
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

export default IATreinamento;
