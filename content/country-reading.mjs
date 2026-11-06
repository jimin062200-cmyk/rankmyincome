// Deliberately limited editorial comparisons; no new country routes or calculator changes.
const cases={
 'ko:MY':{peers:['SG','TH','ID'],title:'말레이시아 중위소득을 주변국과 비교하는 법',text:'말레이시아의 링깃 기준 연소득을 싱가포르 달러나 태국 바트 금액과 바로 비교할 수 없습니다. 아래 표는 각 나라의 중위소득을 해당 국가의 구매력평가 계수로 나눈 값입니다. 소득 연도와 환산 계수의 기준 연도를 각각 확인할 수 있습니다.',reading:'말레이시아에서 상위 10%에 진입하는 소득은 중위소득의 {ten}배이고, 상위 1%의 진입선은 {one}배입니다. 이 비율로 두 진입선까지의 거리는 비교할 수 있지만 쿠알라룸푸르에서 같은 구매력을 누리는 데 필요한 월급을 계산할 수는 없습니다.'},
 'es:MX':{peers:['CO','CL','BR'],title:'México frente a Colombia, Chile y Brasil',text:'La mediana mexicana está expresada en pesos mexicanos. Colombia y Chile también llaman peso a su moneda, pero sus cifras nominales no se pueden comparar directamente. La tabla convierte cada mediana con el factor de poder adquisitivo de su propio país y muestra los dos años de referencia.',reading:'En México, el umbral del 10 % superior equivale a {ten} veces la mediana y el del 1 % superior a {one} veces. Estos cocientes comparan posiciones dentro de México. No indican qué parte del ingreso nacional recibe cada grupo.'},
 'de:MU':{peers:['SC','MG','ZA'],title:'Mauritius im Vergleich: Inselstaaten und Südafrika',text:'Ein Vergleich mit den Seychellen und Madagaskar zeigt unterschiedliche Einkommensgrenzen im Indischen Ozean; Südafrika ergänzt den regionalen Blick. Die Tabelle verwendet Kaufkraft statt Wechselkurse. Sie beschreibt nationale Erwachsenenverteilungen, nicht die Lebenshaltungskosten an einem Urlaubsort.',reading:'Die Top-10-%-Grenze liegt bei {ten} Median-Einkommen; die Top-1-%-Grenze bei {one}. Diese Abstände beschreiben Einkommensgrenzen, nicht den Anteil der gesamten Einkommen, der an die reichsten Gruppen geht.'},
 'de:TH':{peers:['VN','MY','ID'],title:'Thailand und südostasiatische Vergleichsländer',text:'Für Thailand sind Vietnam, Malaysia und Indonesien sinnvolle regionale Bezugspunkte. Baht, Dong, Ringgit und Rupiah lassen sich nicht direkt vergleichen. Deshalb stehen hier Medianwerte in derselben WID-Kaufkrafteinheit. Die nationalen Werte sind keine Gehaltsstatistik für Bangkok oder einzelne Berufe.',reading:'Zwischen Median und Top 10 % liegt ein Faktor von {ten}; bis zur Top-1-%-Grenze sind es {one}. Ein monatlicher Gehaltsvergleich braucht zusätzlich dieselbe Einkommensdefinition: Die WID-Werte enthalten mehr als Arbeitnehmerlohn.'},
 'en:FR':{peers:['BE','IT','ES'],title:'France alongside Belgium, Italy and Spain',text:'These nearby countries provide a regional reference for the French median. The common PPP column compares purchasing power even where countries share the euro: equal nominal euros do not imply equal purchasing power. This comparison does not measure a French net salary or disposable household living standard.',reading:'The French top-10% boundary is {ten} times the median; the top-1% boundary is {one} times the median. These are distances between entry thresholds, not the income shares received by the richest groups.'},
 'en:PK':{peers:['IN','BD','NP'],title:'Pakistan in a South Asian income comparison',text:'Pakistan, India, Bangladesh and Nepal use different local currencies. The PPP medians below put their national distributions into a common purchasing-power unit. They should not be used as currency exchange quotes or as pay benchmarks for a specific city, employer or job.',reading:'Reaching the top 10% in the Pakistan distribution requires {ten} times its median income; the top-1% boundary is {one} times the median. This gap helps interpret an individual rank but cannot identify the average earnings of the top 1%.'},
 'ja:EC':{peers:['CO','PE','BO'],title:'エクアドルと周辺の南米諸国を比較する',text:'コロンビア、ペルー、ボリビアを比較対象にしています。エクアドルの現地通貨表示はUSDですが、現地の1米ドルと世界比較に使う1 USD PPPは同じ単位ではありません。下表では各国の中央値をWIDの購買力平価で換算します。為替レートで送金した場合の金額や、特定の都市の給与を表すものではありません。',reading:'上位10%の境界は中央値の{ten}倍、上位1%の境界は{one}倍です。この倍率は所得分布の境界間の距離であり、上位層が国全体の所得の何割を受け取るかを示すものではありません。'}
};
export function countryReading({data,home,slug,regionName,esc},l,code){
 const spec=cases[`${l}:${code}`];if(!spec)return '';
 const c=data.countries[code],at=(v,p)=>v.thresholds.find(([n])=>n===p)[1];
 const nf=new Intl.NumberFormat(l,{maximumFractionDigits:2});
 const labels={ko:['국가','중위소득 (USD PPP)','소득 연도 / PPP 연도','선택한 국가의 성인 세전 국민소득 중위값입니다. 지역 평균은 표시하지 않습니다.'],es:['País','Mediana (USD PPA)','Año del ingreso / de la PPA','Medianas del ingreso nacional antes de impuestos de los adultos en los países seleccionados.'],en:['Country','Median (USD PPP)','Income / PPP year','Selected peers, not a regional average. All figures use the adult pre-tax income definition.'],de:['Land','Median (USD PPP)','Einkommens- / PPP-Jahr','Ausgewählte Vergleichsländer, kein regionaler Durchschnitt. Alle Werte verwenden das nationale Einkommen vor Steuern für Erwachsene.'],ja:['国','中央値（USD PPP）','所得年 / PPP年','選択した比較国であり、地域の平均ではありません。すべて成人の税引前国民所得の定義を使います。']}[l];
 const rows=[code,...spec.peers].map(k=>{const v=data.countries[k];return `<tr><th scope="row"><a href="${home(l)}countries/${slug(v.name)}/">${esc(regionName(l,k))}</a></th><td>${nf.format(at(v,50)/v.pppPerWorldUnit)}</td><td>${v.dataYear} / ${v.pppYear}</td></tr>`;}).join('');
 return `<section class="country-data-section" data-country-reading><h2>${esc(spec.title)}</h2><p>${esc(spec.text)}</p><div class="threshold-table-wrap" role="region" tabindex="0" aria-label="${esc(spec.title)}"><table class="threshold-table"><caption>${esc(labels[3])}</caption><thead><tr>${labels.slice(0,3).map(x=>`<th scope="col">${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table></div><p>${esc(spec.reading.replace('{ten}',nf.format(at(c,90)/at(c,50))).replace('{one}',nf.format(at(c,99)/at(c,50))))}</p><p>WID.world · <a href="/data-sources.html" lang="en">Data sources (EN)</a> · <a href="${home(l)}rankings/median-income/">${esc(labels[1])} →</a></p></section>`;
}

// Compare distribution shapes at similar median purchasing power.
export function medianPeerTable({data,regionName,esc},l,code,peer,g,countryLabel){
 const titles={
  en:'Closest median purchasing power in this dataset',
  ko:'이 자료에서 중위소득의 구매력이 가장 가까운 국가·지역',
  ja:'このデータで所得中央値の購買力が最も近い国・地域',
  zh:'本数据集中收入中位数购买力最接近的国家或地区',
  es:'El país o territorio con la mediana más cercana en poder adquisitivo',
  fr:'Le pays ou territoire dont le revenu médian en pouvoir d’achat est le plus proche',
  de:'Land oder Gebiet mit der ähnlichsten Kaufkraft des Medianeinkommens',
  pt:'País ou território com a mediana mais próxima em poder de compra'
 };
 const title=titles[l],nf=new Intl.NumberFormat(l,{maximumFractionDigits:2});
 const rows=[code,peer].map(k=>{
  const c=data.countries[k];
  const at=p=>c.thresholds.find(([n])=>n===p)[1];
  return `<tr><th scope="row">${esc(regionName(l,k))}</th><td>${nf.format(at(50)/c.pppPerWorldUnit)}</td><td>${nf.format(at(90)/at(50))}×</td><td>${c.dataYear} / ${c.pppYear}</td></tr>`;
 }).join('');
 return `<h2>${esc(title)}</h2><div class="threshold-table-wrap" role="region" tabindex="0" aria-label="${esc(title)}"><table class="threshold-table" data-median-peer><caption class="sr-only">${esc(title)}</caption><thead><tr><th scope="col">${esc(countryLabel)}</th><th scope="col">${esc(g.median)} (USD PPP)</th><th scope="col">${esc(g.top10)} / ${esc(g.median)} (p90 / p50)</th><th scope="col">${esc(g.year)} / ${esc(g.pppYear)}</th></tr></thead><tbody>${rows}</tbody></table></div><p><a href="/data-sources.html" lang="en">WID.world · Data Sources (EN)</a></p>`;
}
