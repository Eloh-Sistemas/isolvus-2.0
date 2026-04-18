import { useState, useEffect } from "react";

function ItemDoMenu({ modulo, rotinas, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    setOpen(defaultOpen);
  }, [defaultOpen]);

  return (
    <li className="menu-modulo">
      <button
        className={`menu-modulo-toggle${open ? ' ativo' : ''}`}
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '.55rem' }}>
          <i className="bi bi-layers" style={{ color: open ? '#3b82f6' : '#94a3b8', fontSize: '.85rem', transition: 'color .15s' }}></i>
          {modulo}
        </span>
        <i className="bi bi-chevron-down menu-modulo-chevron"></i>
      </button>

      {open && (
        <ul className="menu-rotinas">
          {rotinas.map((r) => (
            <li key={r.id_rotina}>
              <a className="menu-rotina-link" href={r.caminho}>
                <span className="menu-rotina-dot"></span>
                {r.rotina}
              </a>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

export default ItemDoMenu;