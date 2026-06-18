/* Tests Node de la logique pure du morpion. Run: node morpion-rules.test.js */
var R = require("./morpion-rules.js");
var fails = 0;
function eq(actual, expected, msg) {
  var a = JSON.stringify(actual), e = JSON.stringify(expected);
  if (a !== e) { console.error("FAIL:", msg, "=> got", a, "want", e); fails++; }
  else { console.log("ok:", msg); }
}

// 0 = vide, 1 = X, 2 = O
// lignes
eq(R.checkWinner([1,1,1, 0,0,0, 0,0,0]), 1, "ligne haute X");
eq(R.checkWinner([0,0,0, 2,2,2, 0,0,0]), 2, "ligne milieu O");
eq(R.checkWinner([0,0,0, 0,0,0, 1,1,1]), 1, "ligne basse X");
// colonnes
eq(R.checkWinner([1,0,0, 1,0,0, 1,0,0]), 1, "colonne gauche X");
eq(R.checkWinner([0,2,0, 0,2,0, 0,2,0]), 2, "colonne milieu O");
eq(R.checkWinner([0,0,1, 0,0,1, 0,0,1]), 1, "colonne droite X");
// diagonales
eq(R.checkWinner([1,0,0, 0,1,0, 0,0,1]), 1, "diagonale \\ X");
eq(R.checkWinner([0,0,2, 0,2,0, 2,0,0]), 2, "diagonale / O");
// pas de gagnant
eq(R.checkWinner([1,2,1, 1,2,2, 2,1,1]), null, "grille pleine sans gagnant");
eq(R.checkWinner([0,0,0, 0,0,0, 0,0,0]), null, "grille vide");
eq(R.checkWinner([1,2,0, 0,0,0, 0,0,0]), null, "partie en cours");
// nul
eq(R.isDraw([1,2,1, 1,2,2, 2,1,1]), true, "match nul");
eq(R.isDraw([1,1,1, 0,0,0, 0,0,0]), false, "pas nul si gagnant");
eq(R.isDraw([1,2,0, 0,0,0, 0,0,0]), false, "pas nul si cases vides");
// starter suivant : le perdant commence ; sur nul, on alterne
eq(R.nextStarter(1, 1), 2, "J1 gagne -> J2 (perdant) commence");
eq(R.nextStarter(2, 1), 1, "J2 gagne -> J1 (perdant) commence");
eq(R.nextStarter("draw", 1), 2, "nul, starter 1 -> 2");
eq(R.nextStarter("draw", 2), 1, "nul, starter 2 -> 1");

console.log(fails === 0 ? "ALL PASS" : (fails + " FAIL"));
process.exit(fails === 0 ? 0 : 1);
