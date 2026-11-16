const paths = {
  inicio: 'm3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
  herramientas: 'M4 5h6v6H4z M14 5h6v6h-6z M4 15h6v6H4z M14 15h6v6h-6z',
  soluciones: 'M4 3h6v6H4z M14 15h6v6h-6z M7 9v6a3 3 0 0 0 3 3h4 M10 6h7v9',
  resultados: 'M8 3H5a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1h-3 M8 2h8v4H8z m0 11 3 3 5-6',
  comunidad: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  buscar: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0',
  mas: 'M12 5v14 M5 12h14', flecha: 'M4 12h16 m-6-6 6 6-6 6',
  codigo: 'm8 6-6 6 6 6 m8-12 6 6-6 6 m-3-15-2 18',
  guiado: 'M4 5h16v12H9l-5 4Z M8 9h8 M8 13h5',
  candado: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
  actualizar: 'M20 7v5h-5 M4 17v-5h5 M6 6a8 8 0 0 1 14 6 M4 12a8 8 0 0 0 14 6',
  perfil: 'M20 21a8 8 0 0 0-16 0 M16 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0',
  ajustes: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
  salir: 'M9 4H4v16h5 M9 12h12 m-5-5 5 5-5 5', chevron: 'm9 5 7 7-7 7', check: 'm5 12 4 4L19 6',
};
export default function Icono({nombre,className='h-5 w-5',...props}) {
  return <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[nombre]||paths.herramientas}/></svg>;
}
