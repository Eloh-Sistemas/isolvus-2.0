import React from 'react';
import ReactDOM from 'react-dom/client';
import Rotas from './Rotas';
import "./style/global.css";
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';

const root = ReactDOM.createRoot(document.getElementById('root'));

root.render(
  <>
    <ToastContainer
      position="top-center"
      autoClose={3000}
      newestOnTop
      closeOnClick
      pauseOnHover
      draggable
      style={{ zIndex: 99999 }}
    />
    <Rotas />
  </>
);
