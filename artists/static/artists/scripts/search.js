var apiKey = 'a34a3c99cf9117449a64072ef88f562d';
var apiSecret = 'is 9ebb68c7152caa7e19c055a7f41c4aec';
var youtubeAPIKey = 'AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk';
var playlistconstructed = false;
var lastfmname;
var showvideocalls = 0;
var currentplaylisturl;
var ytplayer; //stores the youtube player reference

console.log("email: " + email);
//url is the url of the shared playlist (if any)
console.log("url: " + playlisturl); 

if (playlisturl !== undefined && playlisturl.length > 0) {
  loadPlaylistFromURL(playlisturl);
}

function loadPlaylistFromURL(urlarg) {
  $.get('/ajax/get/', {text: 'getSpecificPlaylist', url: urlarg}, function(data, jqXHR) {
    //data is an array containing json data of specific playlist
    var obj = $.parseJSON(data);
    //extract data
    var url = $.parseJSON(obj[0][0]);
    var playlist = $.parseJSON(obj[0][1]);
    var songs = $.parseJSON(obj[0][2]);
    console.log(url);
    console.log(playlist);
    console.log(songs);

    currentplaylisturl = url[0].fields.url_text;

    //now insert the playlist 

    $('#userplaylist').text(playlist[0].fields.playlist_text);
    var counter = 0;
    $('.topsongslist').each(function() {
      counter++;
    });
    //if a personal playlist has to be loaded
    if (counter === 0) {
      var ul = document.createElement('ul');
      ul.className = 'topsongslist';
      ul.id = 'personalplaylist';
      $('#personalplaylistcontainer').find('.tablecontainer').append(ul);
    }
    //personal playlist is already loaded, so clear it for new playlist
    else {
      $('#personalplaylist').find('.playlistrow').each(function() {
        $(this).remove();
      });
    }

    for (var i = 0; i < songs.length; i++) {
      createPlaylistRow(songs[i].fields.song_id, songs[i].fields.song_name, songs[i].fields.artist_name, songs[i].fields.album_name, url[0].fields.user_email);
    }

  })
  .done(function() {
    console.log( "GET worked" );
  })
  .fail(function() {
    console.log( "GET has error" );
  })
  .always(function() {
    console.log( "GET complete" );
  });
}

/* Set up ajax requests so that they are csrf verified */
function getCookie(name) {
  var cookieValue = null;
  if (document.cookie && document.cookie != '') {
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
      var cookie = jQuery.trim(cookies[i]);
      // Does this cookie string begin with the name we want?
      if (cookie.substring(0, name.length + 1) == (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}
var csrftoken = getCookie('csrftoken');
function csrfSafeMethod(method) {
  // these HTTP methods do not require CSRF protection
  return (/^(GET|HEAD|OPTIONS|TRACE)$/.test(method));
}
function sameOrigin(url) {
  // test that a given url is a same-origin URL
  // url could be relative or scheme relative or absolute
  var host = document.location.host; // host + port
  var protocol = document.location.protocol;
  var sr_origin = '//' + host;
  var origin = protocol + sr_origin;
  // Allow absolute or scheme relative URLs to same origin
  return (url == origin || url.slice(0, origin.length + 1) == origin + '/') ||
    (url == sr_origin || url.slice(0, sr_origin.length + 1) == sr_origin + '/') ||
    // or any other URL that isn't scheme relative or absolute i.e relative.
    !(/^(\/\/|http:|https:).*/.test(url));
}
$.ajaxSetup({
  beforeSend: function(xhr, settings) {
    if (!csrfSafeMethod(settings.type) && sameOrigin(settings.url)) {
      // Send the token to same-origin, relative URLs only.
      // Send the token only if the method warrants CSRF protection
      // Using the CSRFToken value acquired earlier
      xhr.setRequestHeader("X-CSRFToken", csrftoken);
    }
  }
});

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

function showVideoByID(domElement, videoID) {
  loadYouTubeAPI(function () {
    if (ytplayer === undefined) {
      var params = { allowScriptAccess: "always" };
      var atts = { id: "youtubecontainer" };
      swfobject.embedSWF("http://www.youtube.com/v/" + videoID + "?enablejsapi=1&playerapiid=youtubecontainer&version=3",
        "youtubecontainer", "400", "280", "8", null, null, params, atts);
    } 
    else {
      ytplayer.loadVideoById(videoID);
    }
  });
}

//called by default when the youtube player is ready
function onYouTubePlayerReady(playerId) {
  ytplayer = document.getElementById("youtubecontainer");
  if (showvideocalls === 0) {
    ytplayer.addEventListener('onStateChange', 'player_state_changed');
    showvideocalls++;
  }
  ytplayer.playVideo();
}

/* this function is added via an Event Listener to the youtube player so that it's called every time an event
 * occurs */
function player_state_changed(state) {
  /* This event is fired whenever the player's state changes.
     Possible values are:
     - unstarted (-1)
     - ended (0)
     - playing (1)
     - paused (2) 
     - buffering (3)
     - video cued (5). 
     When the SWF is first loaded it will broadcast an unstarted (-1) event.
     When the video is cued and ready to play it will broadcast a video cued 
     event (5).
     */
  //console.log(state);
  if (state === 0) {
    startNextVideo();
  }
}

var videoContainer = document.getElementById("youtubecontainer");
// end of "mini library"

// create a LastFM object
var lastfm = new LastFM({
  apiKey: apiKey,
    apiSecret: apiSecret,
    cache: cache
});

// create a Cache object
var cache = new LastFMCache();

var delay = (function() {
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

//delay execution of API calls 
$('#artistinput').keyup(function(e) {
  if ((e.keyCode >= 65 && e.keyCode <= 90) || (e.keyCode >= 97 && e.keyCode <= 122) || (e.keyCode >= 48 && e.keyCode <= 57)){
    delay(main, 700);
  }
});

function main() {
  clearScreen();
  var userinput = $('#artistinput').val();
  artistGetCorrection(userinput);
  findMatchedSongs(userinput);
}

//get random songs from youtube that match song name
function findMatchedSongs(userinput) {
  lastfm.track.search({track: userinput}, {success: function(data){
    console.log(data);
    var counter = 0;
    while (counter < data.results.trackmatches.track.length) {
    //for (var i = 0; i < data.results.trackmatches.track.length;) {
      var tr = document.createElement('tr');

      if (i % 2 === 0) {
        tr.className = "songtablerow";
      }
      else {
        tr.className = "songtablerow alternate";
      }

      var song = data.results.trackmatches.track[i].name;
      var artist = data.results.trackmatches.track[i].artist;
      var album = "";
      var parsedmbid = data.results.trackmatches.track[i].mbid;

      //api call is synchronous
      lastfm.track.getInfo({mbid: parsedmbid}, {success: function(data){
        album = data.track.album.title;
        var tdsong = document.createElement('td');
        $(tdsong).text(song);
        tdsong.className = 'song name';
        $(tdsong).attr('id', album);
        $(tr).append(tdsong);

        var tdplaylistadd = document.createElement('td');
        $(tdplaylistadd).append('<button class="addtoplaylist btn btn-mini" type="button">Add To Playlist</button>');
        tdplaylistadd.className = 'song add';
        $(tr).append(tdplaylistadd);

        var tdyoutubesearch = document.createElement('td');
        $(tdyoutubesearch).append('<button class="moreresults btn btn-mini" type="button">More Results</button>');
        tdyoutubesearch.className = 'song search';
        $(tr).append(tdyoutubesearch);

        var tdartist = document.createElement('td');
        $(tdartist).text(artist);
        tdartist.className = 'song artist';
        $(tr).append(tdartist);

        $('.songsbody').append(tr);
        counter++;
      }});
    }
  }
  });
}

function clearScreen() {
  $('.infocontainer').remove();
  $('#topsongs').remove();
  $('.imagecontainer').remove();
  $('.playlist').find('li').each(function() {
    $(this).remove();
  });
  $('.artistthumbnail').each(function() {
    $(this).remove();
  });
  $('.songsbody').find('tr').each(function() {
    $(this).remove();
  });
}

function artistGetTopAlbums(userinput) {
  lastfm.artist.getTopAlbums({artist: userinput}, {success: function(data) {
    console.log(data);
  }});
}

/* this function creates the table that contains an artist's top songs, fetches the top tracks from last.fm, and
 * then gets the artist bio */
function artistGetTopTracks(userinput) {
  lastfm.artist.getTopTracks({artist: userinput}, {success: function(data) {
    console.log(data);
    try {
      var table = document.createElement('table');
      $('#topsongscontainer').append(table);
      table.className = 'topsongstable hidden';
      table.id = 'topsongs';
      var tbody = document.createElement('tbody');
      tbody.className = 'topsongsbody';
      $('#topsongscontainer').find('#topsongs').append(tbody);
      for (var i = 0; i < data.toptracks.track.length; i++) {
        var tr = document.createElement('tr');
        if (i % 2 == 0) {
          tr.className = 'songtablerow';
        }
        else {
          tr.className = 'songtablerow alternate';
        }
  $(tbody).append(tr);

  var tdname = document.createElement('td');
  tdname.className = 'topsong name';
  $(tr).append(tdname);
  $(tdname).text(data.toptracks.track[i].name);

  trackGetInfo(tr, data.toptracks.track[i].name, data.toptracks.track[i].artist.name, table, i, data.toptracks.track.length);
      }
      artistGetInfo(data.toptracks.track[0].artist.mbid, data.toptracks.track[0].artist.name);
      //once the current artist data has been fetched, now get the recommended artists
      artistGetSimilar(userinput); 
    }
    catch (err) {

    }
  }
  });
}

/* Get individual track info, specifically the album it belongs to as well as its duration */
function trackGetInfo(tr, trackname, artistname, table, i, numtracks) {
  lastfm.track.getInfo({track: trackname, artist: artistname}, {success: function(data){
    var tdplaylistadd = document.createElement('td');
    $(tdplaylistadd).append('<button class="addtoplaylist btn btn-mini" type="button">Add To Playlist</button>');
    tdplaylistadd.className = 'topsong add';
    $(tr).append(tdplaylistadd);

    var tdyoutubeadd = document.createElement('td');
    //$(tdyoutubeadd).append('<button class="playlater btn btn-mini" type="button">Play Later</button>');
    //tdyoutubeadd.className = 'topsong playlater';
    //$(tr).append(tdyoutubeadd);

    var tdyoutubesearch = document.createElement('td');
    $(tdyoutubesearch).append('<button class="moreresults btn btn-mini" type="button">More Results</button>');
    tdyoutubesearch.className = 'topsong search';
    $(tr).append(tdyoutubesearch);

    var tdalbum = document.createElement('td');
    tdalbum.className = 'topsong album';
    $(tr).append(tdalbum);

    try {
      $(tdalbum).text(data.track.album.title);
    }
    catch (err) {
      //$(tdtime).text("-:--");
    }
    if (i === numtracks - 1) {
      $(table).removeClass('hidden');
    }
  }});
}

/* retrieves spelling corrections from last.fm database - returns "correct spelling" */
function artistGetCorrection(userinput) {
  lastfm.artist.getCorrection({artist: userinput}, {success: function(data) {
    console.log(data);
    try {
      var tr = document.createElement('tr');
      $('#artistsuggestionsbody').append(tr);
      var td = document.createElement('td');
      td.className = 'artistsuggestion';
      $(tr).append(td);
      $(td).text("Did you mean: " + data.corrections.correction.artist.name);
    }
    //if an error is thrown and there are no corrections to be made, execute normally
    catch (err) {
      artistGetTopAlbums(userinput);
      artistGetTopTracks(userinput);
    }
  }});
}

/* gets similar artists from last.fm and appends them as thumbnails to page */
function artistGetSimilar(userinput) {
  lastfm.artist.getSimilar({artist: userinput}, {success: function(data) {
    console.log(data);
    for (var i = 0; i < data.similarartists.artist.length; i++) {
      var artistthumbnail = document.createElement('div');
      artistthumbnail.className = "artistthumbnail";
      artistthumbnail.id = data.similarartists.artist[i].name;
      $(artistthumbnail).append('<div class="opacityoverlay"></div><div class="playbutton hidden"></div><div class="artistthumbnailname hidden"><h6>' + data.similarartists.artist[i].name + '</h6></div>');
      $(artistthumbnail).css('background-image', 'url("' + data.similarartists.artist[i].image[data.similarartists.artist[i].image.length - 2]['#text'] + '")');
      $('#selectioncontainer').append(artistthumbnail);
    }
  }});
}

/* get artist info and append onto page */
function artistGetInfo(mbid, artistname) {
  lastfm.artist.getInfo({mbid: mbid}, {success: function(data) {
    console.log(data);

    //append small artist thumbnail to selection container
    var artistthumbnail = document.createElement('div');
    artistthumbnail.className = "artistthumbnail";
    lastfmname = data.artist.name;
    artistthumbnail.id = data.artist.name;
    $('#selectioncontainer').append(artistthumbnail);
    $(artistthumbnail).append('<div class="opacityoverlay"></div><button class="getartistinfo hidden btn btn-mini btn-primary" type="button">Get Info</button><div class="artistthumbnailname hidden"><h6>' + data.artist.name + '</h6></div>');
    $(artistthumbnail).css('background-image', 'url("' + data.artist.image[data.artist.image.length - 2]['#text'] + '")');

    //make hidden main artist info container
    var infocontainer = document.createElement('div');
    infocontainer.className = 'infocontainer hidden';
    $(infocontainer).append('<button id="infocontainerclose" class="close">&times;</button>');
    $(infocontainer).append('<div id="innerinfocontainer"></div>');
    $(infocontainer).find('#innerinfocontainer').append('<h4 class="artistname">' + data.artist.name + '</h4>');
    $(infocontainer).find('#innerinfocontainer').append('<div id="imageandbio"></div>');
    $(infocontainer).find('#imageandbio').append('<button id="magnify"></button><a id="refartistimage" href="#"><img class="largeartistimage" alt="' + data.artist.name + '" src="' + data.artist.image[data.artist.image.length - 2]['#text'] + '"></img></a>');
    $(infocontainer).find('#imageandbio').append('<p class="artistbio">' + data.artist.bio.content + '</p>');
    document.body.appendChild(infocontainer);

    //now attach the hidden larger image 
    var imagecontainerdiv = document.createElement('div');
    imagecontainerdiv.className = 'imagecontainer hidden';
    $(imagecontainerdiv).append('<button id="magnifylargerimage"></button><a id="refartistimage" href="#"><img id="bigrefartistimage" alt="' + data.artist.name + '" src="' + data.artist.image[data.artist.image.length - 1]['#text'] + '"></img>');
    document.body.appendChild(imagecontainerdiv);
  }});
}

function tagGetWeeklyTopArtist() {
  var topArtistName = '';
  // get weekly artist chart by tag 'trance'
  lastfm.tag.getWeeklyArtistChart({tag: 'trance', limit: 6}, {success: function(data){
    // define top artist name
    topArtistName = data.weeklyartistchart.artist[0].name;
    console.log(topArtistName);
  }});
}

// highlight play button when hovered over
$(document).on('mouseenter', '.playbutton', function() {
  $(this).addClass('hover');
});

// unhighlight play button when no longer hovered over
$(document).on('mouseleave', '.playbutton', function() {
  $(this).removeClass('hover');
});

// handle click on artist suggestion play button
$(document).on('click', '.playbutton', function() {
  //if (name.indexOf("Did you mean:") !== -1) {
    //name = name.substr(13, name.length);
  //}
  var name = $(this).parent().attr('id');
  $('#artistinput').val(name);
  main();
});

//show more results for a particular song
$(document).on('click', '.moreresults', function() {
  var songname = $(this).parent().parent().find('.topsong.name').html();
  var artistname = lastfmname;
  var albumname = $(this).parent().parent().find('.topsong.album').html();
  //get extra youtube results
  $.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=10&q=' + artistname + " " + songname + '&key=AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk', function(data) {
    console.log(data);
    constructYoutubePlaylist();
    for (var i = 0; i < data.items.length; i++) {
      id = data.items[i].id.videoId;
      $('#youtubeplaylist').append('<li id="song0" class="song li"><div id="' + id + '" class="songlisting"><div class="youtubesonginfo"><div class="DivParent"><div class="divVertAlign youtubesongname"><p class="youtubenametext">' + data.items[i].snippet.title + '</p></div><div class="divVertAlign youtubesongartist"><p class="youtubeartisttext">' + artistname + '</p></div><div class="divVertAlign youtubesongalbum"><p class="youtubealbumtext">' + albumname + '</p></div><button class="youtubeaddtoplaylist btn btn-mini" type="button">Add To Playlist</button></div></div></div></li>');
      if (i === data.items.length - 1) {
        startYoutubePlaylist();
      }
    }
  });
});

$(document).on('click', '.youtubeaddtoplaylist', function() {
  alert("youtube add to playlist");
});

$(document).on('mouseenter', '.song.name', function() {
  $(this).addClass('hover');
});

$(document).on('mouseleave', '.song.name', function() {
  $(this).removeClass('hover');
});

$(document).on('click', '.song.name', function() {
  //unhighlight all top songs, then highlight one that is clicked on
  removeAllClicksSongs();
  $(this).parent().addClass('clicked');
  //play song and add it to the playlist
  var songname = $(this).html();
  var artistname = $(this).parent().find('.song.artist').html();
  $.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=' + artistname + " " + songname + '&key=AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk', function(data) {
    console.log(data);
    var id = data.items[0].id.videoId;
    showVideoByID(videoContainer, id);
    //$('.playlist').append('<li id="song0" class="song li"><div id="' + id + '" class="songlisting"><span class="title">' + songname + '</span></div></li>');
    //startYoutubePlaylist();
  });
});

$(document).on('mouseenter', '.song.artist', function() {
  $(this).addClass('hover');
});

$(document).on('mouseleave', '.song.artist', function() {
  $(this).removeClass('hover');
});

//artist name in random youtube songs playlist is clicked
$(document).on('click', '.song.artist', function() {
  clearScreen();
  var userinput = $(this).html();
  $('#artistinput').val(userinput);
  artistGetCorrection(userinput);
  findMatchedSongs(userinput);
});

// highlight top song 
$(document).on('mouseenter', '.songtablerow', function() {
  $(this).addClass('hover');
});

//unhighlight top song
$(document).on('mouseleave', '.songtablerow', function() {
  $(this).removeClass('hover');
});

//underline top song name
$(document).on('mouseenter', '.topsong.name', function() {
  $(this).addClass('hover');
});

//remove underline top song name
$(document).on('mouseleave', '.topsong.name', function() {
  $(this).removeClass('hover');
});

//underline artist name
$(document).on('mouseenter', '.topsong.artist', function() {
  $(this).addClass('hover');
});

//remove underline for artist name
$(document).on('mouseleave', '.topsong.artist', function() {
  $(this).removeClass('hover');
});

// underline top song album
$(document).on('mouseenter', '.topsong.album', function() {
  $(this).addClass('hover');
});

//remove underline top song album
$(document).on('mouseleave', '.topsong.album', function() {
  $(this).removeClass('hover');
});

// highlight song <li>
$(document).on('mouseenter', '.song.li', function() {
  $(this).addClass('hover');
});

//un-highlight song <li>
$(document).on('mouseleave', '.song.li', function() {
  $(this).removeClass('hover');
});

// click on <li> tag containing song name in youtube playlist
$(document).on('click', '.song.li', function() {
  showVideoByID(videoContainer, $(this).find('.songlisting').attr('id'));
  removeAllClicksSongs();
  $(this).addClass('clicked');
});

// when top song name is clicked on
$(document).on('click', '.topsong.name.hover', function() {
  //unhighlight all top songs, then highlight one that is clicked on
  removeAllClicksSongs();
  $(this).parent().addClass('clicked');
  //play song and add it to the playlist
  var songname = $(this).html();
  var artistname = $('#artistinput').val();
  $.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=' + artistname + " " + songname + '&key=AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk', function(data) {
    console.log(data);
    var id = data.items[0].id.videoId;
    showVideoByID(videoContainer, id);
    //$('.playlist').append('<li id="song0" class="song li"><div id="' + id + '" class="songlisting"><span class="title">' + songname + '</span></div></li>');
    //startYoutubePlaylist();
    });
});

// when album is clicked on inside table
$(document).on('click', '.topsong.album.hover', function() {
  //unhighlight everything then highlight currently playing album
  removeAllClicksSongs();
  $(this).parent().addClass('clicked');
  //clear youtube playlist
  $('#video').find('.song.li').each(function() {
    $(this).remove();
  });
  var albumname = $(this).html();
  var artistname = lastfmname;
  //get album stats and then make a playlist for that album
  lastfm.album.getInfo({artist: artistname, album: albumname}, {success: function(data) {
    console.log(data);
    //if table has to be constructed
    constructYoutubePlaylist();
    for (var i = 0; i < data.album.tracks.track.length; i++) {
      loadVideoInPlaylist(data.album.tracks.track[i].name, data.album.tracks.track[i].artist.name, albumname, i, data.album.tracks.track.length);
    }
  }});
});

/* this function gets youtube results for a song and then appends it to a playlist */
function loadVideoInPlaylist(songname, artistname, albumname, i, length) {
  $.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=' + artistname + " " + songname + '&key=AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk', function(videodata) {
      console.log(videodata);
      var id = videodata.items[0].id.videoId;
      //$('#youtubeplaylist').append('<li id="song' + i + '" class="song li"><div id="' + id + '" class="songlisting"><span class="title">' + songname + '</span></div></li>');
      $('#youtubeplaylist').append('<li id="song0" class="song li"><div id="' + id + '" class="songlisting"><div class="youtubesonginfo"><div class="DivParent"><div class="divVertAlign youtubesongname"><p class="youtubenametext">' + songname + '</p></div><div class="divVertAlign youtubesongartist"><p class="youtubeartisttext">' + artistname + '</p></div><div class="divVertAlign youtubesongalbum"><p class="youtubealbumtext">' + albumname + '</p></div><button class="youtubeaddtoplaylist btn btn-mini" type="button">Add To Playlist</button></div></div></div></li>');
      /* only start playing videos in album if elements have been inserted onto page and all of them are present */
      if (i === length - 1) {
        //showVideoByID(videoContainer, $('.playlist').find('li').find('div').attr('id'));
        startYoutubePlaylist();
      }
      });
}

/* create the playlist below the youtube embed if needed (first song played) */
function constructYoutubePlaylist() {
  if (playlistconstructed === false) {
    var playlistdiv = document.createElement('div');
    playlistdiv.className = 'youtubeplaylistdiv';
    playlistdiv.id = 'youtubeplaylistdiv';
    $('#video').append(playlistdiv);
    var playlist = document.createElement('ul');
    playlist.className = 'playlist';
    playlist.id = 'youtubeplaylist';
    $(playlistdiv).append(playlist);
    playlistconstructed = true;

    //to make the bottom of the youtube playlist line up exactly with the song
    //table, the youtube playlist height = song table height - youtube player
    //height + table header height. Basically extending youtube playlist.
    $('#youtubeplaylistdiv').css('height', $('#topsongscontainer').height() - $('#video').height() + $('#personalplaylistheadercontainer').height());
  }
}

//GET ajax functionality 
//if click is true, that means that it was a manual request by the user so html 
//elements have to be made
//
//if playlistname is a string, then the user wants to load the songs of a 
//particular playlist 
//
//if duplicatecheck is a string, then the user wants to make a new playlist so 
//its necessary to check for playlists with the same name as duplicatecheck 
//param - returns true if playlist has same name
//
//callbackfunction is fired to return a boolean value depending on if the 
//playlist exists or not
function getPlaylists(click, playlistname, duplicatecheck, callbackfunction) {
  console.log("pinging backend for playlists belonging to: " + email);
  var foundduplicate = false;
  $.get('/ajax/get/', {text: 'getPlaylists', useremail: email}, function(data, jqXHR) {
    var outerdiv;
    //click is only true for "playlist interface" link click
    if (click === true) {
      outerdiv = document.createElement('div');
      outerdiv.className = "playlistlistingcontainer";
      $(outerdiv).append('<div id="playlistinterfacebackground" style="background-image"></div>');
      var headerdiv = document.createElement('div');
      headerdiv.id = "playlistinterfaceheader";
      $(headerdiv).append('<h3 id="playlistinterfacelabel">Your Saved Playlists</h3>');
      $(headerdiv).append('<button id="playlistinterfaceclose" class="close">&times;</button>');
      $(outerdiv).append(headerdiv);
      var labeldiv = document.createElement('div');
      labeldiv.id = "playlistinterfacelabels";
      $(labeldiv).append('<h3 class="playlistinterfacelabel">Name</h3>');
      $(labeldiv).append('<h3 class="playlistinterfacelabel">Length</h3>');
      $(labeldiv).append('<h3 class="playlistinterfacelabel url">URL</h3>');
      $(outerdiv).append(labeldiv);
      document.body.appendChild(outerdiv);
    }
    //data is an array containing json data of each playlist - parse to separate playlists
    var obj = $.parseJSON(data);
    //for each playlist, extract data
    for (var i = 0; i < obj.length; i++) {
      console.log("i: " + i);
      var url = $.parseJSON(obj[i][0]);
      var playlist = $.parseJSON(obj[i][1]);
      var songs = $.parseJSON(obj[i][2]);
      console.log(url);
      console.log(playlist);
      console.log(songs);
      currentplaylisturl = url[0].fields.url_text;
      //if the user clicked only "playlist interface" link, work with div
      if (click === true) {
        var innerdiv = document.createElement('div');
        innerdiv.className = "playlistlisting";
        var headerdiv = document.createElement('div');
        headerdiv.className = 'playlistlisting headers';
        $(headerdiv).append('<div style="width: 200px; position: relative; float: left;"><p id="playlistlistingname" class="playlistlisting customheader">' + playlist[0].fields.playlist_text + '</p></div>');
        $(headerdiv).append('<div style="width: 110px; position: relative; float: left;"><p id="playlistlistinglength" class="playlistlisting customheader">' + playlist[0].fields.numsongs + ' songs</p></div>');
        $(headerdiv).append('<div style="width: 160px; position: relative; float: left;"><p id="playlistlistingurl" class="playlistlisting customheader">' + url[0].fields.url_text + '</p></div>');
        var buttondiv = document.createElement('div');
        buttondiv.className = 'playlistlisting buttons';
        $(buttondiv).append('<input type="button" id="copyurlplaylistbutton" class="playlistdisplaybutton" value="Copy URL">');
        $(buttondiv).append('<input type="button" id="loadplaylistbutton" class="playlistdisplaybutton" value="Load">');
        $(buttondiv).append('<input type="button" id="deleteplaylistbutton" class="playlistdisplaybutton" value="Delete">');
        $(innerdiv).append(headerdiv);
        $(innerdiv).append(buttondiv);
        $(outerdiv).append(innerdiv);
      }
      console.log("playlist name to load: " + playlistname);
      //if the playlist received from the backend corresponds to the one the user wants to load...
      if (playlist[0].fields.playlist_text === playlistname) {
        $('#personalplaylist').remove();
        var ul = document.createElement('ul');
        ul.className = 'topsongslist';
        ul.id = 'personalplaylist';
        $('#personalplaylistcontainer').find('.tablecontainer').append(ul);
        console.log("song length: " + songs.length);
        for (var j = 0; j < songs.length; j++) {
          createPlaylistRow(songs[j].fields.song_id, songs[j].fields.song_name, songs[j].fields.artist_name, songs[j].fields.album_name);
        }
      }
      //if the playlist the user wants to create has the same name
      if (duplicatecheck === playlist[0].fields.playlist_text) {
        console.log("duplicatecheck = playlist[0].fields.playlist_text")
        callbackfunction(true);
      }
    }
    //program reached this point, so no duplicate
    if (duplicatecheck !== undefined) {
      callbackfunction(false);
    }
  })
  .done(function() {
    console.log( "GET worked" );
  })
  .fail(function() {
    console.log( "GET has error" );
  })
  .always(function() {
    console.log( "GET complete" );
  });
}

/* compute table div heights on window load */
window.onload = function(event) {
  getPlaylists(false);
  var height = $(window).height() - 100; 
  if (height - 100 >= 400) {
    $('#container').css('height', height - 100);
  }
  else {
    $('#container').css('height', 400);
  }
  //to make the bottom of the youtube playlist line up exactly with the table of
  //songs, the youtube playlist height = song table height - youtube player
  //height + table header height. Basically extending youtube playlist.
  $('#youtubeplaylistdiv').css('height', $('#topsongscontainer').height() - $('#video').height() + $('#personalplaylistheadercontainer').height());
}

/* when window size changes, also change sizes of divs */
window.onresize = function(event) {
  var height = $(window).height() - 100; 
  if (height - 100 >= 400) {
    $('#container').css('height', height - 100);
  }
  else {
    $('#container').css('height', 400);
  }
  //to make the bottom of the youtube playlist line up exactly with the table of
  //songs, the youtube playlist height = song table height - youtube player
  //height + table header height. Basically extending youtube playlist.
  $('#youtubeplaylistdiv').css('height', $('#topsongscontainer').height() - $('#video').height() + $('#personalplaylistheadercontainer').height());
}

/* mouse hover over larger artist image in hidden artist bio div */
$(document).on('click', '#magnify', function() {
  $('.imagecontainer').removeClass('hidden');
});

/* mouse leaves largest artist image in hidden image div */
$(document).on('click', '#magnifylargerimage', function() {
  $('.imagecontainer').addClass('hidden');
});

//mouse hovers over load playlist button
$(document).on('mouseenter', '.playlistdisplaybutton', function() {
  $(this).addClass('hover');
});

//mouse leaves load playlist button
$(document).on('mouseleave', '.playlistdisplaybutton', function() {
  $(this).removeClass('hover');
});

/* mouse hover over personal playlist button */
$(document).on('mouseenter', '.playlistbutton', function() {
  $(this).addClass('hover');
});

/*mouse leaves personal playlist button*/
$(document).on('mouseleave', '.playlistbutton', function() {
  $(this).removeClass('hover');
});

// click on span icon to close info container with artist info
$(document).on('click', '#infocontainerclose', function() {
  $('.infocontainer').addClass('hidden');
});

//click on span to close playlist interface
$(document).on('click', '#playlistinterfaceclose', function() {
  $(this).parent().parent().remove();
});

//mouse hover over artist recommendation thumbnail at top of screen
$(document).on('mouseenter', '.artistthumbnail', function() {
  $(this).find('button').removeClass('hidden');
  $(this).find('.opacityoverlay').addClass('hover');
  $(this).find('.playbutton').removeClass('hidden');
  $(this).find('.playbutton').addClass('partial');
  $(this).find('.artistthumbnailname').removeClass('hidden');
});

//mouse leaves hover over artist recommendation thumbnail at top of screen
$(document).on('mouseleave', '.artistthumbnail', function() {
  $(this).find('button').addClass('hidden');
  $(this).find('.opacityoverlay').removeClass('hover');
  $(this).find('.playbutton').removeClass('partial');
  $(this).find('.playbutton').addClass('hidden');
  $(this).find('.artistthumbnailname').addClass('hidden');
});

/* get current artist info button clicked */
$(document).on('click', '.getartistinfo', function() {
  $('.infocontainer').removeClass('hidden');
});

//click on delete playlist button
$(document).on('click', '#deleteplaylistbutton', function() {
  var playlistinfo = $(this).parent().parent().find('.playlistlisting.headers').find('#playlistlistingname').html();
  playlistinfo = playlistinfo.split(" ");
  var playlistname = playlistinfo[1];
  var url = $(this).parent().parent().find('.playlistlisting.headers').find('#playlistlistingurl').html();
  var owner = $(this).parent().parent().find('.playlistlisting.headers').find('#playlistlistingowner').html();
  var playlisturlinfo = $(this).parent().parent().find('#playlistlistingurl').html();
  temp = playlisturlinfo.split(" ");
  var playlisturl = temp[1];
  $(this).parent().parent().remove(); //remove the smaller div containing this playlists info
  $.ajax({
     type:"POST",
     url: "/ajax/post/",
     data: {
       'email': email,
       'text': 'deletePlaylist',
       'playlist': playlistname,
       'url': playlisturl
     },
    success: function(data){
      console.log("deleted");
    }
  });
});
//click on load playlist button
$(document).on('click', '#loadplaylistbutton', function() {
  var playlistname = $(this).parent().parent().find('.playlistlisting.headers').find('#playlistlistingname').html();
  var url = $(this).parent().parent().find('.playlistlisting.headers').find('#playlistlistingurl').html();
  var owner = $(this).parent().parent().find('.playlistlisting.headers').find('#playlistlistingowner').html();
  //var parse = playlistname.split(" ");
  getPlaylists(false, playlistname); //ping backend for data then insert into page
  $(this).parent().parent().parent().remove(); //remove entire interface prompt
  $('#userplaylist').text(playlistname); //change header for personal playlist
});

$(document).on('click', '#copyurlplaylistbutton', function() {
  var text = $(this).parent().parent().find('#playlistlistingurl').text();
  text = text.substring(0);
  window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
});

var addtoplaylistrow;

// add to playlist button clicked
$(document).on('click', '.addtoplaylist', function() {
  var counter = 0;
  $('.newplaylistcontainer').each(function() {
    counter++;
  });
  //disable adding other songs if a prompt is open to make a new playlist
  if (counter === 0) {
    counter = 0;
    $('#personalplaylist').find('li').each(function() {
      counter++;
    })
    //if playlist doesn't have anything in it
    if (counter === 0) {
      var song = $(this).parent().parent().find('.topsong.name').html();
      if (song === undefined) {
        song = $(this).parent().parent().find('.song.name').html();
      }
      var artist = lastfmname;
      var album = $(this).parent().parent().find('.topsong.album').html();
      if (album === undefined) {
        album = $(this).parent().parent().find('.song.name').attr('id');
      }
      var id;
      //by default the song in the top songs table is the top result of the youtube query, so add that to the
      //personal playlist
      $.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=' + artist + " " + song + '&key=AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk', function(data) {
        id = data.items[0].id.videoId;
        createPlaylistRow(id, song, artist, album);
      });
    }
    //a playlist is already there, so check if the user owns it or not
    else {
      tempemail = $('#personalplaylist').find('li').attr('id');
      if (tempemail === email) {
        var song = $(this).parent().parent().find('.topsong.name').html();
        if (song === undefined) {
          song = $(this).parent().parent().find('.song.name').html();
        }
        var artist = lastfmname;
        var album = $(this).parent().parent().find('.topsong.album').html();
        if (album === undefined) {
          album = $(this).parent().parent().find('.song.name').attr('id');
        }
        var id;
        //by default the song in the top songs table is the top result of the youtube query, so add that to the
        //personal playlist
        $.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=1&q=' + artist + " " + song + '&key=AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk', function(data) {
            id = data.items[0].id.videoId;
            createPlaylistRow(id, song, artist, album);
        });
      }
      else {
        alert(email + ", you cannot modify a playlist you don't own");
      }
    }
  }
});

//if otherplaylist owner has a parameter, it's a public playlist
function createPlaylistRow(id, song, artist, album, otherplaylistowner) {
  var li = document.createElement('li');
  li.className = 'playlistrow';
  if (otherplaylistowner !== undefined && otherplaylistowner.length > 0) {
    li.id = otherplaylistowner;
  }
  else {
    li.id = email; //store email of playlist owner in each li tag
  }
  //bigdiv holds all song info and operations in playlist
  var bigdiv = document.createElement('div');
  bigdiv.className = 'songcontainer';
  //div holds song name, artist, and album alone
  var div = document.createElement('div');
  div.className = 'songinfo';

  //innerdiv contains song name, rtist, and album but makes formatting easier
  var innerdiv = document.createElement('div');
  innerdiv.className = 'DivParent';
  $(innerdiv).append('<div id="' + id + '" class="divVertAlign songname"><p class="nametext">' + song + '</p></div>');
  $(innerdiv).append('<div class="divVertAlign songartist"><p class="artisttext">' + artist + '</p></div>');
  $(innerdiv).append('<div class="divVertAlign songalbum"><p class="albumtext">' + album + '</p></div>');

  $(div).append(innerdiv);

  //divoptions contain buttons to perform operation on song in playlist
  var divoptions = document.createElement('div');
  divoptions.className = 'songops';
  $(divoptions).append('<input type="button" class="songop" value="Top">');
  $(divoptions).append('<input type="button" class="songop" value="Bottom">');
  $(divoptions).append('<input type="button" class="songop" value="Delete">');

  $(innerdiv).append(divoptions);

  $(bigdiv).append(div);
  $(li).append(bigdiv);

  var counter = 0;
  //if a personal playlist table already exists, append the new row
  $('#personalplaylist').each(function() {
    counter++;
  })
  if (counter > 0) {
    $('#personalplaylist').append(li);
  }
  //let user create a personal playlist on the fly with prompt
  else {
    addtoplaylistrow = li;
    var div = document.createElement('div');
    div.className = 'newplaylistcontainer';
    $(div).append('<button id="newplaylistclose" class="close">&times;</button><header class="header">New Playlist</header><input type="text" name="playlist_name" id="playlist_name" placeholder="Playlist Name" class="playlistinput"><input type="button" id="newplaylistbuttonsong" class="newplaylistbutton" value="Create Playlist">');
    document.body.appendChild(div);
  }
  $("#personalplaylist").sortable({
    stop: function(event, ui) {
    }
  });
}

// new playlist link clicked
$(document).on('click', '#newplaylistlink', function() {
  $('.playlistlistingcontainer').remove();
  $('.loadplaylisturlcontainer').remove();
  $('.newplaylistcontainer').remove();
  var div = document.createElement('div');
  div.className = 'newplaylistcontainer';
  $(div).append('<button id="newplaylistclose" class="close">&times;</button><header class="header">New Playlist</header><input type="text" name="playlist_name" id="playlist_name" placeholder="Playlist Name" class="playlistinput"><input type="button" id="newplaylistbutton" class="newplaylistbutton" value="Create Playlist">');
  document.body.appendChild(div);
});

// new playlist button clicked to create the table
$(document).on('click', '#newplaylistbutton', function() {
  createPersonalPlaylistElements(false);
});

//new playlist button clicked to create a table and then append a song
$(document).on('click', '#newplaylistbuttonsong', function() {
  createPersonalPlaylistElements(true);
});

//click on button to load playlist by url
$(document).on('click', '#loadplaylisturllink', function() {
  $('.playlistlistingcontainer').remove();
  $('.newplaylistcontainer').remove();
  $('.loadplaylisturlcontainer').remove();
  var div = document.createElement('div');
  div.className = 'loadplaylisturlcontainer';
  $(div).append('<button id="newplaylistclose" class="close">&times;</button><header class="header">Load Playlist</header><input type="text" name="playlist_url" id="playlist_url" placeholder="Playlist Url" class="playlistinput"><input type="button" id="loadplaylisturlbutton" class="loadplaylisturlbutton" value="Load Playlist">');
  document.body.appendChild(div);
});

$(document).on('mouseenter', '#loadplaylisturlbutton', function() {
  $(this).addClass('hover');
});

$(document).on('mouseleave', '#loadplaylisturlbutton', function() {
  $(this).removeClass('hover');
});

$(document).on('click', '#loadplaylisturlbutton', function() {
  var url = $('#playlist_url').val();
  if (url !== undefined && url.length > 0) {
    loadPlaylistFromURL(url);
  }
  $('.loadplaylisturlcontainer').remove();
});

function createPersonalPlaylistElements(append) {
  //check all existing playlists belonging to user for a duplicate playlist with same name
  getPlaylists(false, "", $('#playlist_name').val(), function(returnValue) {
    //if getPlaylists returned false, meaning no match was found
    if (returnValue === false) {
      currentplaylisturl = ""; //reset the current playlist url
      var input = $('#playlist_name').val();
      var foundchar = false;
      for (var i = 0; i < input.length; i++) {
        if (input.charAt(i) !== ' ' && input.charAt(i) !== '\t') {
          foundchar = true;
        }
      }
      if (input.length > 0 && foundchar === true) {
        $('#userplaylist').text(input);
        $('.newplaylistcontainer').remove();
        var counter = 0;
        $('.topsongslist').each(function() {
          counter++;
        })
        //if a personal playlist has to be loaded
        if (counter === 0) {
          var ul = document.createElement('ul');
          ul.className = 'topsongslist';
          ul.id = 'personalplaylist';
          $('#personalplaylistcontainer').find('.tablecontainer').append(ul);
        }
        //personal playlist is already loaded, so clear it for new playlist
        else {
          $('#personalplaylist').find('.playlistrow').each(function() {
            $(this).remove();
          });
        }
        //if the user also wants to append a song
        if (append === true) {
          $('#personalplaylist').append(addtoplaylistrow);
        }
      }
    }
    else {
      alert('A Playlist of yours already has that name. Please choose another');
      $('#playlist_name').val("");
    }
  });
}

/* mouse hover over button to save playlist name */
$(document).on('mouseenter', '.newplaylistbutton', function() {
  $(this).addClass('hover');
});

/* mouse leaves button to save playlist name */
$(document).on('mouseleave', '.newplaylistbutton', function() {
  $(this).removeClass('hover');
});

/* when close icon is clicked at top right of "Create new playlist" div */
$(document).on('click', '#newplaylistclose', function() {
  $(this).parent().remove();
});

function saveLinkRemoveClicked() {
  $('.savelink').removeClass('clicked');
}

// save playlist link clicked
$(document).on('click', '.savelink', function() {
  var counter = 0;
  $(this).addClass('clicked');
  window.setTimeout(saveLinkRemoveClicked, 100);
  //check if a playlist even exists
  $('#personalplaylist').each(function() {
    counter++;
  });
  if (counter > 0) {
    counter = 0;
    //count rows
    $('#personalplaylist').find('.playlistrow').each(function() {
      counter++;
    });
    //check if the person trying to save a change actually owns the playlist
    if (counter === 0 || email === $('#personalplaylist').find('.playlistrow').attr('id')) {
      var playlistname = $('#userplaylist').html();
      var playlisturl = currentplaylisturl;
      console.log(playlistname + ": " + playlisturl);
      var songs = [];
      $('#personalplaylist').find('.playlistrow').each(function() {
        var songname = $(this).find('.divVertAlign.songname').find('p').html();
        var artistname = $(this).find('.divVertAlign.songartist').find('p').html();
        var albumname = $(this).find('.divVertAlign.songalbum').find('p').html();
        var songid = $(this).find('.divVertAlign.songname').attr('id');

        var song = {
          name: songname,
        id: songid,
        artist: artistname,
        album: albumname
        };
        songs.push(song);
      });
      for (var i = 0; i < songs.length; i++) {
        console.log(songs[i]);
      }
      $.ajax({
        type:"POST",
        url: "/ajax/post/",
        data: {
          'email': email,
        'text': 'savePlaylist',
        'playlist': playlistname,
        'songs': JSON.stringify(songs),
        'url': playlisturl
        },
        success: function(data){
          console.log("old url: " + data)
        //remove quotes from url
        data = data.substr(1);
      data = data.substr(0, data.length - 1);
      console.log("new url: " + data);
      currentplaylisturl = data;
        }
      });
    }
    else {
      alert(email + ", you cannot save a playlist you don't own");
    }
  }
});

//clear playlist link clicked
$(document).on('click', '#clearplaylistlink', function() {
  if (email === $('#personalplaylist').find('li').attr('id')) {
    $('#personalplaylist').find('li').each(function() {
      $(this).remove();
    });
  }
});

//mouse hovers over row inside custom playlist
$(document).on('mouseenter', '.playlistrow', function() {
  $(this).addClass('hover');
  $(this).find('.divVertAlign.songartist').addClass('hover');
  $(this).find('.songop').each(function() {
    $(this).addClass('rowhover');
  });
});

//mouse leaves row inside custom playlist
$(document).on('mouseleave', '.playlistrow', function() {
  $(this).removeClass('hover');
  $(this).find('.divVertAlign.songartist').removeClass('hover');
  $(this).find('.songop').each(function() {
    $(this).removeClass('rowhover');
  });
});

//mouse hovers over button inside custom playlist
$(document).on('mouseenter', '.songop', function() {
  $(this).addClass('hover');
});

//mouse leaves button inside custom playlist
$(document).on('mouseleave', '.songop', function() {
  $(this).removeClass('hover');
});

//button in row of personal playlist is clicked 
$(document).on('click', '.songop', function() {
  var val = $(this).attr('value');
  if (val === 'Top') {
    var row = $(this).parent().parent().parent().parent().parent();
    var ul = $('#personalplaylist').prepend(row).slideDown();
  }
  else if (val === 'Bottom') {
    var row = $(this).parent().parent().parent().parent().parent();
    var ul = $('#personalplaylist').append(row).slideDown();
  }
  else if (val === 'Delete') {
    if ($(this).parent().parent().parent().parent().parent().attr('id') === email) {
      $(this).parent().parent().parent().parent().parent().remove();
    }
  }
});


// view playlists link is clicked
$(document).on('click', '#viewplaylistslink', function() {
  $('.playlistlistingcontainer').remove();
  $('.loadplaylisturlcontainer').remove();
  $('.newplaylistcontainer').remove();
  getPlaylists(true);
});

//song in personal playlist is clicked on
$(document).on('click', '.playlistrow', function(e) {
  //make sure that the element clicked is not specifically a button in the playlist row
  if ($(e.target).is('.songop') === false) {
    var songname = $(this).find('.divVertAlign.songname').find('p').html();
    var artistname = $(this).find('.divVertAlign.songartist').find('p').html();
    removeAllClicksSongs();
    $(this).addClass('clicked');

    //$.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=' + artistname + " " + songname + '&key=AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk', function(data) {
      //console.log(data);
      //var id = data.items[0].id.videoId;
      var id = $(this).find('.divVertAlign.songname').attr('id');
      showVideoByID(videoContainer, id);
      //});
  }
});


//when playlist selection tab is clicked 
$(document).on('click', '.playlisttab', function() {
  //de-select other tab then select clicked one
  $('.playlisttab').removeClass("click");
  $(this).addClass("click");
  //if the user clicked on the top songs tab
  var tabname = $(this).attr('id');
  if (tabname === "TopSongsTab") {
    $('.playlistcontainer').addClass("hidden");
    $('#topsongsouterdiv').removeClass("hidden");
  }
  else if (tabname === "PersonalPlaylistTab"){
    $('.playlistcontainer').addClass("hidden");
    $('#personalplaylistcontainer').removeClass("hidden");
  }
  else if (tabname === "SongsTab") {
    $('.playlistcontainer').addClass("hidden");
    $('#songsouterdiv').removeClass('hidden');
  }
});

/* This function starts up the youtube playlist  */
function startYoutubePlaylist() {
  var numvideosplaying = 0;
  $('#youtubeplaylist').find('.song.li.clicked').each(function() {
    numvideosplaying++;
  });
  //if no video is currently selected, start up the first one
  if (numvideosplaying === 0) {
    //highlight the first song in the playlist
    var counter = 0;
    $('.playlist').find('.song.li').each(function() {
      if (counter === 0) {
        $(this).addClass('clicked');
      }
      counter++;
    });
    $('.playlist').find('.song.li.clicked').each(function() {
      showVideoByID(videoContainer, $(this).find('div').attr('id')); 
    });
  }
}

/* this function removes all clicked stylings so that only one song in one playlist is being played at a time */
function removeAllClicksSongs() {
  //top songs table
  $('.topsongsbody').find('tr').each(function() {
    $(this).removeClass('clicked');
  });
  $('.songsbody').find('tr').each(function() {
    $(this).removeClass('clicked');
  });
  //personal playlist
  $('#personalplaylist').find('li').each(function() {
    $(this).removeClass('clicked');
  });
  //youtube playlist
  $('#youtubeplaylist').find('li').each(function() {
    $(this).removeClass('clicked');
  });
}

/* this function starts playing the next video in the playlist that the focus is on */
function startNextVideo() {
  //search top songs table  for song that just ended
  $('.topsongsbody').find('tr').each(function() {
    if ($(this).attr('class').indexOf('clicked') !== -1) {
      $(this).removeClass('clicked');
      if ($(this).next().find('.topsong.name').html() !== undefined) {
        $(this).next().addClass('clicked');
        var songname = $(this).next().find('.topsong.name').html();
        $.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=' + lastfmname + " " + songname + '&key=AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk', function(data) {
          console.log(data);
          var id = data.items[0].id.videoId;
          showVideoByID(videoContainer, id);
          });
      }
      return false;
    }
  });
  //search personal playlist for song that just ended
  $('#personalplaylist').find('li').each(function() {
    if ($(this).attr('class').indexOf('clicked') !== -1) {
      $(this).removeClass('clicked');
      if ($(this).next().find('.divVertAlign.songname').find('p').html() !== undefined) {
        $(this).next().addClass('clicked');
        var songname = $(this).next().find('.divVertAlign.songname').find('p').html();
        var artistname = $(this).next().find('.divVertAlign.songartist').find('p').html();
        $.getJSON('https://www.googleapis.com/youtube/v3/search?part=snippet&maxResults=20&q=' + artistname + " " + songname + '&key=AIzaSyAd2yd0orz2jxFowskzThTAZ70eXHUZ8Rk', function(data) {
          console.log(data);
          var id = data.items[0].id.videoId;
          showVideoByID(videoContainer, id);
          });
      }
      return false;
    }
  });
  //search youtube playlist for song that just ended
  $('#youtubeplaylist').find('li').each(function() {
    if ($(this).attr('class').indexOf('clicked') !== -1) {
      $(this).removeClass('clicked');
      $(this).next().addClass('clicked');
      return false;
    }
  });
}

//this shuffles the playlist and produces visual results
function shufflePlaylist() {
  songs = [];
  var numsongs = 0; //keep track if a playlist even exists
  $('#personalplaylist').find('.playlistrow').each(function() {
    $(this).remove();
    numsongs++;
    songstorage = new Object();
    songstorage.name = $(this).find('.nametext').html();
    songstorage.artist = $(this).find('.artisttext').html();
    songstorage.album = $(this).find('.albumtext').html();
    songstorage.id = $(this).find('.divVertAlign.songname').attr('id');
    console.log(songstorage);
    songs.push(songstorage);
  });
  if (numsongs > 0) {
    for (var i = 0; i < songs.length; i++) {
      console.log(songs[i].name);
    }
    //now that all the songs have been temporarily staved...
    var currentIndex = songs.length, temporaryValue, randomIndex;
    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex);
      currentIndex--;

      // And swap it with the current element.
      temporaryValue = songs[currentIndex];
      songs[currentIndex] = songs[randomIndex];
      songs[randomIndex] = temporaryValue;
    }
    //the array has been rearranged, so reinsert into the playlist
    for (var i = 0; i < songs.length; i++) {
      console.log(songs[i].name);
      createPlaylistRow(songs[i].id, songs[i].name, songs[i].artist, songs[i].album);
    }
  }
}

$(document).on('click', '.shufflelink', function() {
  shufflePlaylist();
  if ($(this).attr('class') == 'shufflelink clicked') {
    $(this).removeClass('clicked');
  }
  else {
    $(this).addClass('clicked');
  }
});

$(document).on('click', '.headerlink', function() {
  $(this).addClass('clicked');
  window.setTimeout(headerlinkUnclick, 100);
});
function headerlinkUnclick() {
  $('.headerlink').removeClass("clicked");
}

//prototype String method for calculating the lenght of a string
String.prototype.width = function() {
  var o = $('<div>' + this + '</div>')
  .css({'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden'})
  .appendTo($('body')),
  w = o.width();
  o.remove();
  return w;
}

/* ticker implementation */
$(document).on('mouseenter', '.youtubenametext', function() {
  //if there's overflow and it's not being animated
  if (($(this).html().width() > $(this).width()) && !$(this).hasClass('ticker')) {
    $(this).addClass('ticker');
    var width = $(this).html().width();
    //console.log(Object.prototype.toString.call($(this).html()));
    originalstring = $(this).text(),
    containerwidth = $(this).parent().width(),
    left = 0; //make it wrap from the start
    $(this).append('\t' + $(this).text());
    console.log(originalstring);
    var runonce = false;
    tick($(this), left, width, runonce, originalstring, false);
  }
});

//separate function declaration - if we made this an inner function in the 
//mouseenter portion, the data in the closure which is stored can overwrite
//other data, so things get messy
function tick(item, left, width, runonce, originalstring, larger) {
  if (!larger) {
    if(--left < -width - 10){
      left = 0;
      runonce = true;
      item.text(originalstring);
      //now remove class, since animation finished
      item.removeClass('ticker');
    }
  }
  else {
    if(--left < -width - 40){
      left = 0;
      runonce = true;
      item.text(originalstring);
      //now remove class, since animation finished
      item.removeClass('ticker');
    }
  }
  item.css("margin-left", left + "px");
  if (!runonce) {
    setTimeout(function() {
      tick(item, left, width, runonce, originalstring, larger);
    }, 16)
  }
}

$(document).on('mouseenter', '.youtubeartisttext', function() {
  //if there's overflow and it's not being animated
  if (($(this).html().width() > $(this).width()) && !$(this).hasClass('ticker')) {
    $(this).addClass('ticker');
    var width = $(this).html().width();
    //console.log(Object.prototype.toString.call($(this).html()));
    originalstring = $(this).text(),
    containerwidth = $(this).parent().width(),
    left = 0; //make it wrap from the start
    console.log(originalstring);
    $(this).append('\t' + $(this).text());
    var runonce = false;
    tick($(this), left, width, runonce, originalstring, false);
  }
});

//method to get the width of a string with large font
String.prototype.bigWidth = function(fontsize) {
  var o = $('<div>' + this + '</div>')
  .css({'position': 'absolute', 'float': 'left', 'white-space': 'nowrap', 'visibility': 'hidden', 'font-size': fontsize})
  .appendTo($('body')),
  w = o.width();
  o.remove();
  return w;
}

$(document).on('mouseenter', '.artisttext', function() {
  //if there's overflow and it's not being animated
  if (($(this).html().bigWidth(18) > $(this).width()) && !$(this).hasClass('ticker')) {
    $(this).addClass('ticker');
    var width = $(this).html().width();
    //console.log(Object.prototype.toString.call($(this).html()));
    originalstring = $(this).text(),
    containerwidth = $(this).parent().width(),
    left = 0; //make it wrap from the start
    console.log(originalstring);
    $(this).append('\t' + $(this).text());
    var runonce = false;
    tick($(this), left, width, runonce, originalstring, true);
  }
});

$(document).on('mouseenter', '.nametext', function() {
  //if there's overflow and it's not being animated
  if (($(this).html().bigWidth(18) > $(this).width()) && !$(this).hasClass('ticker')) {
    $(this).addClass('ticker');
    var width = $(this).html().width();
    //console.log(Object.prototype.toString.call($(this).html()));
    originalstring = $(this).text(),
    containerwidth = $(this).parent().width(),
    left = 0; //make it wrap from the start
    console.log(originalstring);
    $(this).append('\t' + $(this).text());
    var runonce = false;
    tick($(this), left, width, runonce, originalstring, true);
  }
});

$(document).on('mouseenter', '.albumtext', function() {
  //if there's overflow and it's not being animated
  if (($(this).html().bigWidth(18) > $(this).width()) && !$(this).hasClass('ticker')) {
    $(this).addClass('ticker');
    var width = $(this).html().width();
    //console.log(Object.prototype.toString.call($(this).html()));
    originalstring = $(this).text(),
    containerwidth = $(this).parent().width(),
    left = 0; //make it wrap from the start
    console.log(originalstring);
    $(this).append('\t' + $(this).text());
    var runonce = false;
    tick($(this), left, width, runonce, originalstring, true);
  }
});

$(document).on('mouseenter', '#userplaylist', function() {
  //if there's overflow and it's not being animated
  if (($(this).html().bigWidth(21) > $(this).width()) && !$(this).hasClass('ticker')) {
    $(this).addClass('ticker');
    var width = $(this).html().bigWidth(21);
    //console.log(Object.prototype.toString.call($(this).html()));
    originalstring = $(this).text(),
    containerwidth = $(this).parent().width(),
    left = 0; //make it wrap from the start
    $(this).append('\t' + $(this).text());
    var runonce = false;
    tick($(this), left, width, runonce, originalstring, false);
  }
});

$(document).on('mouseenter', '#playlistlistingname', function() {
  //if there's overflow and it's not being animated
  if (($(this).html().width() > $(this).width()) && !$(this).hasClass('ticker')) {
    $(this).addClass('ticker');
    var width = $(this).html().width();
    //console.log(Object.prototype.toString.call($(this).html()));
    originalstring = $(this).text(),
    containerwidth = $(this).parent().width(),
    left = 0; //make it wrap from the start
    $(this).append('\t' + $(this).text());
    var runonce = false;
    tick($(this), left, width, runonce, originalstring, false);
  }
});
