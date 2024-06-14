// ==UserScript==
// @name         ChatGPT
// @namespace    aman
// @version      1.3
// @description  Add a delete button with a trash icon to ChatGPT chats for easy removal
// @author       You
// @match        https://chatgpt.com/*
// @grant        GM_xmlhttpRequest
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js
// @downloadURL https://raw.githubusercontent.com/amanhigh/tampermonkey-fun/master/Gpt.user.js
// @updateURL   https://raw.githubusercontent.com/amanhigh/tampermonkey-fun/master/Gpt.user.js
// ==/UserScript==

'use strict';

// Define a variable at the top of the script to hold the token
var bearerToken = null;

function getBearerToken() {
    // Prompt the user for the token if it's not already set
    if (!bearerToken) {
        bearerToken = prompt("Please enter your Bearer token:", "");
    }
    return bearerToken;
}

function removeChatFromSidebar(chatId) {
    // Finding the anchor element that ends with the specific chatId in its href attribute
    const selector = `a[href$="/c/${chatId}"]`;
    const chatItem = $(selector).closest('li');  // Select the closest 'li' element to this anchor

    if (chatItem.length) {
        chatItem.remove();  // Remove the chat item from the DOM
    } else {
        console.log(`Chat item with ID: ${chatId} not found.`);
    }
}

function modifyChatVisibility(chatId) {
    const token = getBearerToken();  // Ensure we have a token before making the call
    if (!token) {
        console.log("No Bearer token provided.");
        alert("Operation canceled. No Bearer token provided.");
        return;  // Exit the function if no token is provided
    }

    GM_xmlhttpRequest({
        method: "PATCH",
        url: `https://chatgpt.com/backend-api/conversation/${chatId}`,
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`,  // Use the retrieved or stored token
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "sec-ch-ua": "\"Brave\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Linux\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-gpc": "1"
        },
        data: JSON.stringify({ is_visible: false }),
        onload: function (response) {
            if (response.status === 200 || response.status === 204) {
                removeChatFromSidebar(chatId);  // Adjust based on actual UI needs
            } else {
                console.log(`Failed to modify chat visibility with ID ${chatId}: HTTP status ${response.status}`);
                alert("Failed to modify chat visibility.");
            }
        },
        onerror: function (response) {
            console.log("Error making request:", response.statusText);
            alert("Error in network request.");
        },
        withCredentials: true  // This is important if credentials like cookies are needed for the API call
    });
}


function addDeleteHook() {
    $(document).on('contextmenu', 'li.relative', function (event) {
        event.preventDefault();
        const chatId = $(this).find('a').attr('href').split('/').pop();
        modifyChatVisibility(chatId);
        return false;
    });
}

$(document).ready(function () {
    addDeleteHook();
});
