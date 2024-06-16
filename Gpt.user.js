// ==UserScript==
// @name         ChatGPT
// @namespace    aman
// @version      1.5
// @description  Manage ChatGPT chats more effectively.
// @author       Amanpreet Singh
// @match        https://chatgpt.com/*
// @grant        GM_xmlhttpRequest
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.6.1/jquery.min.js
// ==/UserScript==

(function () {
    'use strict';

    /**
     * Token management for API authentication.     
     */
    let bearerToken = getBearerToken();

    /**
     * Prompt user for bearer token if not already stored and save it to session storage.
     * @returns {string} The bearer token.
     */
    function getBearerToken() {
        let token = localStorage.getItem('bearerToken');
        if (!token || token === "null") {
            token = prompt("Please enter your Bearer token:");
            localStorage.setItem('bearerToken', token);
        }
        return token;
    }


    /**
     * Finding the anchor element that ends with the specific chatId in its href attribute
     *
     * @param {type} chatId - description of parameter
     * @return {type} description of return value
     */
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

    /**
     * Get standard headers for API requests.
     * @returns {Object} Headers object for HTTP requests.
     */
    function apiHeaders() {
        return {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${bearerToken}`,
            "accept": "*/*",
            "accept-language": "en-US,en;q=0.9",
            "sec-ch-ua": "\"Brave\";v=\"125\", \"Chromium\";v=\"125\", \"Not.A/Brand\";v=\"24\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Linux\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "sec-gpc": "1"
        };
    }

    /**
     * Handle API response, processing status and invoking callback on success.
     * @param {Object} response - The XMLHttpRequest response object.
     * @param {Function} successCallback - Callback to invoke on successful API response.
     */
    function handleApiResponse(response, successCallback) {
        if (response.status === 200 || response.status === 204) {
            successCallback();
        } else {
            console.error(`API Error: ${response.statusText}`);
            alert("Failed to perform operation.");
        }
    }

    /**
     * Modify the visibility of a chat.
     * @param {string} chatId - The ID of the chat to modify.
     */
    function modifyChatVisibility(chatId) {
        if (!bearerToken) {
            console.error("No Bearer token provided.");
            alert("Operation canceled. No Bearer token provided.");
            return;
        }

        GM_xmlhttpRequest({
            method: "PATCH",
            url: `https://chatgpt.com/backend-api/conversation/${chatId}`,
            headers: apiHeaders(),
            data: JSON.stringify({ is_visible: false }),
            onload: response => handleApiResponse(response, () => removeChatFromSidebar(chatId)),
            onerror: response => console.error('Network Error:', response.statusText)
        });
    }

    /**
     * Modify the title of a chat.
     * @param {string} chatId - The ID of the chat.
     * @param {string} newTitle - The new title to set.
     * @param {HTMLElement} element - DOM element representing the chat title.
     */
    function modifyChatTitle(chatId, newTitle, element) {
        GM_xmlhttpRequest({
            method: "PATCH",
            url: `https://chatgpt.com/backend-api/conversation/${chatId}`,
            headers: apiHeaders(),
            data: JSON.stringify({ title: newTitle }),
            onload: response => handleApiResponse(response, () => $(element).text(newTitle)),
            onerror: response => console.error('Network Error:', response.statusText)
        });
    }

    /**
     * Set up event listeners for modifying chats on user interactions.
     */
    function addHooks() {
        $(document).on('contextmenu', 'li.relative', function (event) {
            event.preventDefault();
            const chatId = $(this).find('a').attr('href').split('/').pop();

            if (event.shiftKey) {
                const currentTitle = $(this).text().trim();
                const newTitle = '# ' + currentTitle;
                modifyChatTitle(chatId, newTitle, this);
            } else {
                modifyChatVisibility(chatId);
            }

            return false;
        });

        $(document).on('click', 'li.relative a', function (event) {
            if (event.shiftKey) {
                event.preventDefault();
                const chatId = $(this).attr('href').split('/').pop();
                const currentTitle = $(this).text();
                const newTitle = `* ${currentTitle}`;
                modifyChatTitle(chatId, newTitle, this);
            }
        });
    }

    $(document).ready(addHooks);
})();
