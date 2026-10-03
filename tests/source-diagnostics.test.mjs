import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compileLoopStyle} from '../src/language/styleLanguage.js';
import {compileLoopMarkdown} from '../src/language/loopMarkdown.js';
import {sourceDiagnostic} from '../src/app/sourceDiagnostics.js';
test('authoring diagnostics retain the error line and explain recovery in Portuguese',()=>{
 for(const [compile,source,expected] of [
  [compileLoopStyle,'variable { wrong: 2; }','Propriedade'],
  [compileLoopMarkdown,'# M\n\n## Variables\n\nnot a variable','Variável inválida']
 ]){
  try{compile(source);assert.fail('must reject invalid source');}catch(error){
   const text=sourceDiagnostic(error);assert.match(text,/Linha \d+:/);assert.ok(text.includes(expected));assert.match(text,/último mapa válido foi preservado/);
  }
 }
});
