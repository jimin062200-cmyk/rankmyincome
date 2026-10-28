import {createHash} from 'node:crypto';
// Exclude navigation, asset hashes and advertising: only substantive page content
// is reviewed. If it changes, omit lastmod until a new review is recorded.
export function searchFingerprint(html){
 const parts=[html.match(/<title>[\s\S]*?<\/title>/)?.[0],html.match(/<meta name="description"[^>]*>/)?.[0],html.match(/<main\b[\s\S]*?<\/main>/)?.[0],...[...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(m=>m[1])];
 if(parts.some(x=>!x))throw Error('Incomplete search content');
 return createHash('sha256').update(parts.join('\n')).digest('hex');
}
export function verifiedLastmod(html,entry){
 return entry&&/^\d{4}-\d{2}-\d{2}$/.test(entry.lastmod)&&entry.sha256===searchFingerprint(html)?entry.lastmod:null;
}
