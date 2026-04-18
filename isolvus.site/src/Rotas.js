import { BrowserRouter, Route, Routes } from "react-router-dom";
import Login from "./paginas/Login/Login";
import Home from "./paginas/Home/Home";
import SolicitacaoDeDespesa from "./paginas/SolicitacaoDeDespesa/SolicitacaoDeDespesa.jsx";
import SolicitacaoDeDespesaConsultar from "./paginas/SolicitacaoDeDespesa/SolicitacaoDeDespesaConsultar.jsx";
import EndPointConsulta from "./paginas/API/End-Point/EndPointConsulta.jsx";
import OrcamentoMensal from "./paginas/OracamentoMensal/OrcamentoMensal.jsx";
import PermissaoDeRotina from "./paginas/PermissaoDeRotina/PermissaoDeRotina.jsx";
import CadastroDeUsuario from "./paginas/CadastroDeUsuario/CadastroDeUsuario.jsx";
import CadastroDeFilial from "./paginas/Cadastro de Filial/CadastroDeFilial.jsx";
import AcompanhamentoDespesa1 from "./paginas/AcompanhamentoDespesa1/AcompanhamentoDespesa1.jsx";
import CadastroDeVeiculo from "./paginas/CadastroDeVeiculo/CadastroDeVeiculo.jsx";
import VincularContaOrdenador from "./paginas/VincularContaOrdenador/VincularContaOrdendador.jsx";
import CadastroDeItem from "./paginas/CadastroDeItem/CadastroDeItem.jsx";
import VisitaCliente from "./paginas/Promotor/VisitaCliente/VisitaCliente.jsx";
import AcompanhamentoDeVisita from "./paginas/Promotor/VisitaCliente/AcompanhamentoDeVisita.jsx";
import IaEloh from "./componentes/TelaIA/iaEloh.jsx";
import IntegracaoFornecedorCadastro from "./paginas/IntegracaoFornecedorCadastro/IntegracaoFornecedorCadastro.jsx";
import PreCadastroCliente from "./paginas/PreCadastroCliente/PreCadastroCliente.jsx";
import AuditarLocalizacao from "./paginas/AuditarLocalizacao/AuditarLocalizacao.jsx";
import VersionChecker from "./componentes/versionChecker/versionCehcker.jsx";
import RelatorioControleDeDespesa from "./paginas/RelatorioControleDeDespesa/RelatorioControleDeDespesa.jsx";
import RelatorioAutorizacaoDePagamento from "./paginas/RelatorioAutorizacaoDePagamento/RelatorioAutorizacaoDePagamento.jsx";
import ImportacaoDespesa from "./paginas/ImportacaoDespesa/ImportacaoDespesa.jsx";
import IATreinamento from './paginas/IATreinamento/IATreinamento.jsx';

function Rotas () {
    return <BrowserRouter>
             <Routes>
                <Route path="/" element={<Login />}  />
                <Route path="/Home" element={<Home />}  />                
                
                {/*Rotas solicitações de despesas*/}
                <Route path="/SolicitacaoDeDespesa/:tipoConsulta" element={<SolicitacaoDeDespesaConsultar />}  />                                 
                <Route path="/SolicitacaoDeDespesa/Solcitacao/:tipoTela" element={<SolicitacaoDeDespesa />}  />                                                 
                <Route path="/SolicitacaoDeDespesa/Solcitacao/:tipoTela/:id_solicitacao" element={<SolicitacaoDeDespesa />}  /> 
                <Route path="/VincularContaOrdendador" element={<VincularContaOrdenador />}  /> 
                <Route path="/CadastrodeItem" element={<CadastroDeItem />}  /> 
                <Route path="/DerpatamentoPessoal/ImportacaoDespesa" element={<ImportacaoDespesa />}  />

                {/* Rotas Telas dos RelatórioDespesa1 de Usuario */}
                <Route path="/SolicitacaoDeDespesa/AcompanhamentoDespesa" element={<AcompanhamentoDespesa1 />} />   
                <Route path="/Relatorio/ControleDeDespesa" element={<RelatorioControleDeDespesa />} />  
                <Route path="/Relatorio/AutorizacaoDePagamento" element={<RelatorioAutorizacaoDePagamento />} />

                {/*Rotas telas da API*/}                 
                <Route path="/Api/EndPoint" element={<EndPointConsulta />}  /> 

                {/*Rtoas Cadastro de Filial*/}
                <Route path="/Configuracao/CadastroDeFilial" element={<CadastroDeFilial />}  /> 
                
                {/*Rotas do Orcamento Mensal */}
                <Route path="/OrcamentoMensal" element={<OrcamentoMensal />} />

                {/* Rotas Telas dos Modulos de Usuario */}
                <Route path="/Permissao/Usuario" element={<PermissaoDeRotina />} />                
                <Route path="/Cadastro/Usuario" element={<CadastroDeUsuario />} />    

                {/* Rotas Telas do Modulo de Frota */}
                <Route path="/Frota/CadastroDeVeiculo" element={<CadastroDeVeiculo/>} /> 

                {/**/}
                <Route path="/Promotor/VisitaCliente" element={<VisitaCliente/>} />       
                <Route path="/Promotor/AcompanhamentoDeVisita" element={<AcompanhamentoDeVisita/>} />       

               {/* IA - Eloh */}
               <Route path="/IA/AnalistaDeDados" element={<IaEloh />} />    
               <Route path="/IA/Treinamento" element={<IATreinamento />} />

               {/*Comercial*/}         
               <Route path="/Comercial/IntegracaoFornecedor/Cadastro" element={<IntegracaoFornecedorCadastro />} />    

               {/*Cadastro*/}         
               <Route path="/PreCadastro/Cliente" element={<PreCadastroCliente />} />  

               <Route path="/Auditar/Localizacao/Cliente" element={<AuditarLocalizacao />} />  


             </Routes>
             <VersionChecker />
           </BrowserRouter>
}

export default Rotas;