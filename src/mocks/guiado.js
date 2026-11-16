// Fixtures para aceptación interceptada. Ninguna pantalla las usa como fallback.
const text = name => ({ type:'object',properties:{[name]:{type:'string'}},required:[name],additionalProperties:false });
export const opcionesGuiadas = {items:[
  {id:'11111111-1111-4111-8111-111111111111',name:'Limpiar extremos',description:'Quita espacios de los extremos.',visibility:'private',review_hash:'a'.repeat(64),input_schema:text('texto'),output_schema:text('resultado'),parameter_schema:{type:'object',properties:{},additionalProperties:false}},
  {id:'22222222-2222-4222-8222-222222222222',name:'Convertir a mayúsculas',description:'Convierte el texto a mayúsculas.',visibility:'private',review_hash:'b'.repeat(64),input_schema:text('texto'),output_schema:text('resultado'),parameter_schema:{type:'object',properties:{},additionalProperties:false}},
],next_cursor:null,search_truncated:false};
export const planGuiado = {format_version:1,name:'Limpiar y convertir texto',description:'Quita espacios exteriores y convierte el resultado a mayúsculas.',input_schema:text('texto'),nodes:[
  {id:'limpiar',version_id:opcionesGuiadas.items[0].id,label:'Limpiar extremos',parameters:{},values:{},bindings:{texto:{source:'$input',field:'texto'}},x:0,y:0},
  {id:'mayusculas',version_id:opcionesGuiadas.items[1].id,label:'Convertir a mayúsculas',parameters:{},values:{},bindings:{texto:{source:'limpiar',field:'resultado'}},x:330,y:0},
],outputs:{resultado:{source:'mayusculas',field:'resultado'}}};
export const herramientaGuiada = {name:'Convertir texto de prueba',description:'Convierte un texto a mayúsculas para una prueba guiada.',category:'Texto',input_type:'texto',output_type:'texto',input_schema:text('texto'),output_schema:text('resultado'),parameter_schema:{type:'object',properties:{},additionalProperties:false},required_permissions:[],resources:[],constraints:['Conservar los espacios interiores'],failure_cases:[],examples:[{inputs:{texto:'ejemplo'},parameters:{},expected_output:{resultado:'EJEMPLO'}}]};
