// ==UserScript==
// @name         ChatGPT Delete Chat Button with Icon
// @namespace    aman
// @version      1.3
// @description  Add a delete button with a trash icon to ChatGPT chats for easy removal
// @author       You
// @match        https://chatgpt.com/*
// @grant        GM_xmlhttpRequest
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js
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
        console.log(`Removing chat item with ID: ${chatId}`);
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


/**
 * Appends a delete button with a trash icon to each chat item if not already present.
 */
function addDeleteButton() {
    $('li.relative').each(function () {
        const chatId = $(this).find('a').attr('href').split('/').pop();
        if (!$(this).find('.delete-btn').length) {
            $(this).find('div.group').append(`
                    <button class="delete-btn" style="position: absolute; right: 10px; top: 10px; background: none; border: none;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
                            <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zM14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1 0-2h4a.5.5 0 0 1 0 1h3a.5.5 0 0 1 0-1h4a1 1 0 0 1 1 1zM12 4H4v9a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4z"/>
                        </svg>
                    </button>
                `);
            $(this).find('.delete-btn').on('click', function () {
                modifyChatVisibility(chatId);
            });
        }
    });
}

/**
 * Observer to handle dynamic addition of chat items to the DOM.
 */
function setupMutationObserver() {
    const observer = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                addDeleteButton();
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// Initialize the mutation observer and add buttons to existing chat items.
setupMutationObserver();
addDeleteButton();
