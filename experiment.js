// ==UserScript==
// @name        Experiment
// @namespace   aman
// @description Tamper Monkey Experiemnt Script
// @include     http://www.example.net/
// @version     1.0
// @grant       none
// @downloadURL https://github.com/amanhigh/tampermonkey-fun/raw/master/example.user.js
// ==/UserScript==

// Note that in most cases, updateURL and downloadURL
// is NOT NECESSARY. Greasemonkey will automatically 
// use the URL you used to download script
// Wiki: https://wiki.greasespot.net/Metadata_Block#.40downloadURL

// Use this to check if your script will update, among other things
// Wiki: https://wiki.greasespot.net/GM_info
console.log("Script will "+(GM_info?"":"not ")+"update.");
  /// code
