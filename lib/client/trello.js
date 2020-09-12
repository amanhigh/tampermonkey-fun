const snfBoardId = "5b0fb8122611996bf3b1eb3a";
const setListId = "5b0fb8122611996bf3b1eb3b";
const notTakenListId = "5cfb58544c0c65863097655f";
const templateIdMap = {
    "MWD-CT-F": "5e371210e096bb0fc7feb409",
    "MWD-T-F" : "5e37123b78179482bfbaba7c",
    "WDH2-CT-F": "5e3712df7f1630869f9d559d",
    "WDH2-T-F":"5e3712cfb57c1210b4627055"
}

function createTrelloCard(title, sourceId, listId) {
    let request = {
        name: title,
        idCardSource: sourceId,
        keepFromSource: "checklists,attachments,stickers,members,labels",
        idBoard: snfBoardId,
        idList: listId,
        token: trelloToken
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