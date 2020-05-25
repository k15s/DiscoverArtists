var YouTubeAPILoaded = false;

var videoID = parseYoutubeID(child['url']);
if (videoID === "Error") {
  alert("The video could not be loaded");
} else {
  showVideoByID(videoID, videoContainerDiv, ytplayer);
}


// Extract the video ID from an original youtube URL
function parseYoutubeID(url) {
    console.log("Parsing: " + url);
    // http://stackoverflow.com/questions/3452546/javascript-regex-how-to-get-youtube-video-id-from-url
    var regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    var match = url.match(regExp);
    if (match && match[2].length == 11) {
        return match[2];
    } else {
        return "Error";
    }
}

// Params:
//   video ID: alphanumeric string that represents ID of video
//   wrapperDiv: div that contains a nested, inner div
//   ytplayerElem: the nested, inner div within wrapperDiv and is replaced by
//                 iframe player
function showVideoByID(videoID, wrapperDiv, ytplayerElem) {
    loadYouTubeAsync(function() {
      if (!wrapperDiv.player) {
          wrapperDiv.player = new YT.Player(ytplayerElem, {
            height: '345',
            width: '587',
            videoId: videoID
          });
      }
    });
}

// Load the IFrame Player API code asynchronously.
function loadYouTubeAsync(callback) {
    if (YouTubeAPILoaded) {
        callback();
    } else {
        var tag = document.createElement('script');
        tag.src = "https://www.youtube.com/player_api";
        var firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);

        // Automatic callback function called the first time the YouTube API
        // code downloads.
        window.onYouTubePlayerAPIReady = function () {
            YouTubeAPILoaded = true;
            callback();
        }
    }
}
