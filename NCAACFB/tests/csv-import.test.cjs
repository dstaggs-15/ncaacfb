const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/dynasty/addStats/addStats.ts'), 'utf8').replace(/^import .*$/gm, '')
  + '\nexport { parseCSV, findProfile, findTeamListItem, getGameTypeInfoFromCSV, createGameKey };';
const context = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2023}}).outputText, context);
const {parseCSV, findProfile, findTeamListItem, getGameTypeInfoFromCSV, createGameKey} = context.exports;
const profiles = [
  {id:'cam', username:'cam2cosmic@gmail.com', display_name:'Cozmic Zencho'},
  {id:'dan', username:'daniel.staggs0215@gmail.com', display_name:'RebelVette15'},
  {id:'tuck', username:'tuckermcafee14@gmail.com', display_name:null},
  {id:'eli', username:null, display_name:'Eli'}
];
for (const [name,id] of [['cozmic','cam'],['rebelvette15','dan'],['Daniel','dan'],['Tucker','tuck'],['Eli','eli']]) assert.equal(findProfile(name,profiles)?.id,id);
assert.equal(parseCSV('home_team,away_team\r\n"Texas A&M","FCS Midwest"\r\n')[0].away_team,'FCS Midwest');
assert.equal(getGameTypeInfoFromCSV('Conference Championship','Conf Champ').sortOrder,17);
assert.equal(getGameTypeInfoFromCSV('National Championship',"Nat'l Champ").sortOrder,30);
assert.equal(getGameTypeInfoFromCSV('Bowl','Bowl 3').sortOrder,20);
assert.equal(createGameKey('s','Texas','Maryland',34,48,0,'regular_season','Week 0'),createGameKey('s','Texas','Maryland',48,35,0,'regular_season','Week 0'));
assert.notEqual(createGameKey('s','Texas','Maryland',34,48,0,'regular_season','Week 0'),createGameKey('s','Texas','Maryland',34,48,null,'bowl','Bowl 1'));
if (process.argv[2]) {
 const rows = parseCSV(fs.readFileSync(process.argv[2],'utf8'));
 const teams = JSON.parse(fs.readFileSync(path.join(__dirname,'../public/assets/teams/teamlist.json'),'utf8'));
 assert.equal(rows.length,42);
 for (const [i,r] of rows.entries()) {
   for (const side of ['home','away']) {
     assert.ok(findTeamListItem(r[side+'_team'],teams),`row ${i+1} team`);
     if (r[side+'_user']) assert.ok(findProfile(r[side+'_user'],profiles),`row ${i+1} coach`);
   }
 }
}
console.log('CSV regression checks passed.');
