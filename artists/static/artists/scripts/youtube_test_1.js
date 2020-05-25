
// "mini library" starts here
var youTubeAPILoaded = false;

function loadYouTubeAPI (callBack) {
    if (!youTubeAPILoaded) {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/player_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        window.onYouTubePlayerAPIReady = function () {
            youTubeAPILoaded = true;
            callBack();
        }
    } else {
        callBack();
    }
}

function showVideoByID (domElement, videoID) {
    loadYouTubeAPI(function () {
        if (!domElement.player) {
            domElement.player = new YT.Player(domElement, {
                height      : '283',
                width       : '600',
                videoId     : videoID,
                playerVars: {
                    'rel'       : 0,
                    'autoplay'  : 1
                }
            });
        } else {
            domElement.player.loadVideoById(videoID);
        }
        nowPlaying = player;
        currentPopup[0].previousLanguage = language
    });

}
// end of "mini library"

var videoContainer = document.getElementById("video1");
showVideoByID(videoContainer , "9bZkp7q19f0");

$('#clicker').on('click', function() {
  alert('blah');
    showVideoByID(videoContainer , "6PtIg5IbeLg");
});
