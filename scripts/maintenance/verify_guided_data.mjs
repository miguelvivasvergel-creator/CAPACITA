import assert from 'node:assert/strict';
import {admiteFormulario,datosIniciales,pasosEnOrden} from '../../src/utils/formularioDatos.js';
import {leerExperiencia,guardarExperiencia} from '../../src/utils/experiencia.js';

const values=new Map();globalThis.localStorage={getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)};
assert.equal(leerExperiencia('cuenta-a'),'guiado');guardarExperiencia('cuenta-a','desarrollador');assert.equal(leerExperiencia('cuenta-a'),'desarrollador');assert.equal(leerExperiencia('cuenta-b'),'guiado');
guardarExperiencia('cuenta-b','administrador');assert.equal(leerExperiencia('cuenta-b'),'guiado');
globalThis.localStorage={getItem(){throw Error('blocked');},setItem(){throw Error('blocked');}};assert.equal(leerExperiencia('cuenta-a'),'guiado');assert.doesNotThrow(()=>guardarExperiencia('cuenta-a','desarrollador'));
const schema={type:'object',additionalProperties:false,required:['activo','datos','cantidad'],properties:{activo:{type:'boolean'},cantidad:{type:'integer'},datos:{type:'array',items:{type:'string'}},opcional:{type:'string'}}};
assert.equal(admiteFormulario(schema),true);assert.deepEqual(datosIniciales(schema),{activo:false,datos:[],cantidad:undefined});
assert.equal(admiteFormulario({type:'object',additionalProperties:true}),false);assert.equal(admiteFormulario({oneOf:[{type:'string'},{type:'number'}]}),false);assert.equal(admiteFormulario({$ref:'#/a'}),false);
const child={id:'b',bindings:{texto:{source:'a',field:'resultado'}}},parent={id:'a',bindings:{texto:{source:'$input',field:'texto'}}};
const original=[child,parent];assert.deepEqual(pasosEnOrden(original).map(node=>node.id),['a','b']);assert.equal(original[0],child);
console.log('Guiado: aislamiento de preferencias, almacenamiento bloqueado, datos tipados sin ejemplos heredados, esquemas no soportados y orden de lectura: OK.');
