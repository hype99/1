(function () {
            function shareLink() {
                var url = window.location.href;
                var text = "Check out this live match streaming on Cric Hype!";

                if (navigator.share) {
                    navigator.share({
                        title: "Watch Live Cricket",
                        text: text,
                        url: url
                    }).catch(function (err) {
                        console.error("Error sharing:", err);
                    });
                } else {
                    if (navigator.clipboard && navigator.clipboard.writeText) {
                        navigator.clipboard.writeText(url).then(function() {
                            alert("Page link copied to clipboard!");
                        });
                    } else {
                        var tempInput = document.createElement("input");
                        tempInput.value = url;
                        document.body.appendChild(tempInput);
                        tempInput.select();
                        document.execCommand("copy");
                        document.body.removeChild(tempInput);
                        alert("Page link copied to clipboard!");
                    }
                }
            }
            window.shareLink = shareLink;
        })();
