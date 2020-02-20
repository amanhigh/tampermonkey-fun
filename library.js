function message(msg) {
    //Find
    var el = document.getElementById("el-msg");
    if (!el) {
        //Build
        el = document.createElement("div");
        el.id = "el-msg";
        el.setAttribute("style", "background-color: black; color: white;font-size: 15px; position:absolute;top:20%;left:76%");
        el.innerHTML = "";

        //Remove after timeout
        setTimeout(function () {
            el.parentNode.removeChild(el);
        }, 5000);

        document.body.appendChild(el);
    }

    el.innerHTML += '<br/>' + msg;

}