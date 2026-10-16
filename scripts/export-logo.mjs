import opentype from 'opentype.js';
import { readFile, writeFile } from 'node:fs/promises';
const load=async(file)=>{const buffer=await readFile(file);return opentype.parse(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength));};
const heading=await load('dist/assets/oswald-600.ttf');
const body=await load('dist/assets/manrope-700.ttf');
function outline(font,text,x,y,size,spacing=0) {
  let result='';
  for(const character of text) {
    const glyph=font.charToGlyph(character);
    result+=glyph.getPath(x,y,size).toPathData(2);
    x+=glyph.advanceWidth/font.unitsPerEm*size+spacing;
  }
  return result;
}
const wordmark=outline(heading,'ЛЕСА–ВЫШКИ',87,49,39);
const tagline=outline(body,'ВАША НАДЁЖНАЯ ОПОРА',88,69,8.8,1.45);
const logoWidth=Math.ceil(103+[...'ЛЕСА–ВЫШКИ'].reduce((sum,c)=>sum+heading.charToGlyph(c).advanceWidth/heading.unitsPerEm*39,0));
const mark='<g fill="none" stroke="#f65c28" stroke-width="4.5" stroke-linejoin="miter"><path d="M9 77V15h24v62M45 77V15h24v62M9 46h60M9 15l24 31L9 77M45 15l24 31-24 31"/></g>';
const logo=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${logoWidth} 92" role="img" aria-labelledby="title"><title id="title">Леса-вышки — ваша надёжная опора</title>${mark}<path fill="#153b53" d="${wordmark}"/><path fill="#153b53" d="${tagline}"/></svg>`;
await writeFile('dist/assets/logo.svg',logo);
await writeFile('dist/assets/logo-light.svg',logo.replaceAll('fill="#153b53"','fill="#ffffff"'));
console.log('Exported self-contained outlined logos.');
