/* ============================================================
   QUEST — logique pure du morpion (sans Firebase, sans DOM).
   board : tableau de 9 entiers. 0 = vide, 1 = X (J1), 2 = O (J2).
   UMD : utilisable en navigateur (window.MorpionRules) et en Node.
   ============================================================ */
(function (root) {
  "use strict";
  var LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],   // lignes
    [0, 3, 6], [1, 4, 7], [2, 5, 8],   // colonnes
    [0, 4, 8], [2, 4, 6]               // diagonales
  ];

  function checkWinner(board) {
    for (var k = 0; k < LINES.length; k++) {
      var a = LINES[k][0], b = LINES[k][1], c = LINES[k][2];
      if (board[a] !== 0 && board[a] === board[b] && board[b] === board[c]) return board[a];
    }
    return null;
  }

  function isDraw(board) {
    if (checkWinner(board) !== null) return false;
    for (var i = 0; i < 9; i++) { if (board[i] === 0) return false; }
    return true;
  }

  // qui commence la manche suivante : le perdant (l'autre que winner) ;
  // sur égalité, on alterne depuis le starter de la manche écoulée.
  function nextStarter(winner, starter) {
    if (winner === 1 || winner === 2) return winner === 1 ? 2 : 1;
    return starter === 1 ? 2 : 1;
  }

  var api = { checkWinner: checkWinner, isDraw: isDraw, nextStarter: nextStarter };
  if (typeof module !== "undefined" && module.exports) { module.exports = api; }
  root.MorpionRules = api;
})(typeof window !== "undefined" ? window : this);
