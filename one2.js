(function () {
            function shareLink() {
                var url = window.location.href;
                var text = "Check out this live match streaming on Cric Hype!";
                if (navigator.share) {
                    navigator.share({ title: "Watch Live Cricket", text: text, url: url }).catch(err => console.log(err));
                } else {
                    navigator.clipboard.writeText(url).then(() => {
                        showToast("Link copied to clipboard!");
                    });
                }
            }
            window.shareLink = shareLink;
        })();
