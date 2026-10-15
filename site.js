/* Shared progressive enhancements; all navigation also works without JavaScript. */
'use strict';
for (const menu of document.querySelectorAll('.site-header details')) {
  menu.addEventListener('toggle', () => {
    if(menu.open) for(const other of document.querySelectorAll('.site-header details')) if(other!==menu) other.open=false;
  });
  menu.addEventListener('keydown', e => {
    if(e.key==='Escape'){ menu.open=false; menu.querySelector('summary').focus(); }
  });
}
document.addEventListener('click',e=>{
  for(const menu of document.querySelectorAll('.site-header details')) if(!menu.contains(e.target))menu.open=false;
});
const directorySearch=document.querySelector('#directory-search');
if(directorySearch) directorySearch.addEventListener('input',()=>{
  const norm=s=>s.normalize('NFD').replace(/\p{Diacritic}/gu,'').toLocaleLowerCase();
  const query=norm(directorySearch.value.trim());let count=0;
  for(const a of document.querySelectorAll('[data-search]')){a.hidden=!norm(a.dataset.search).includes(query);if(!a.hidden)count++;}
  document.querySelector('#directory-empty').hidden=count>0;
});
