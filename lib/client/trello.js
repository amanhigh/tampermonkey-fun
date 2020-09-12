const snfBoardId = "5b0fb8122611996bf3b1eb3a";

function createTrelloCard(title, sourceId, listId) {
    let request = {
        name: title,
        idCardSource: sourceId,
        keepFromSource: "checklists,attachments,stickers,members,labels",
        idBoard: snfBoardId,
        idList: listId,
        token: GM_getValue(trelloTokenStore)
    }

    // console.log(JSON.stringify(request));

    GM.xmlHttpRequest({
        headers: {
            "Accept": "application/json, text/javascript, */*; q=0.01",
            "Accept-Language": "en-US,en;q=0.5",
            "Content-Type": "application/json",
            "X-Trello-Client-Version": "build-5792",
            "X-Requested-With": "XMLHttpRequest",
        },
        url: "https://trello.com/1/cards",
        method: "POST",
        mode: "CORS",
        referrer: "https://trello.com/b/zThIpFBz/set-forget",
        data: JSON.stringify(request),
        credentials: "include",
        onload: function (response) {
            if (response.status === 200) {
                message('Card Created'.fontcolor('green'))
            } else {
                message('Card Create Failed'.fontcolor('red'))
                console.log(response)
            }
        },
        onerror: function () {
            message("Trello: Error Creating Card".fontcolor('red'));
        }
    });
}