# Create your views here. Views are based off POST requests.
from django.http import HttpResponse, HttpResponseRedirect
from django.template import Context, RequestContext, loader
from django.core.urlresolvers import reverse
from django.shortcuts import render, get_object_or_404
from django.http import Http404
from django.views import generic
from django.utils import simplejson
from django.shortcuts import render_to_response
from django.core.context_processors import csrf
import json, string, random, math, sys, traceback, re
from pprint import pprint
from django.db import IntegrityError, connection
from django.core import serializers
from django.core.urlresolvers import reverse

from artists.models import Account, URL, Playlist, Song

numpossibles = 62
rand_digits = [1]

def index(request):
    return render_to_response('artists/search.html')

# this function is called via url /search/
def search(request):
    csrfContext = RequestContext(request)
    parsedemail = simplejson.dumps(request.POST.get('email'))
    email = parsedemail.replace('"', "")
    print("backend got email: " + email + " (unparsed: " + parsedemail + ")")
    #print("backend got url: " + request.POST.get('playlisturl'))
    print("backend got password: " + request.POST.get('password'))
    playlisturl = simplejson.dumps(request.POST.get('playlisturl'))
    print("backend got url: " + playlisturl)

    if email is None or len(email) == 0:
        return render_to_response('artists/login.html', {'missingemail': True}, csrfContext)

    # check email/account existence
    try:
        account = Account.objects.get(email_text=email)
        # password validation
        if (request.POST.get('password') != account.password_text):
            print "backend got incorrect password"
            return render_to_response('artists/login.html', {'incorrectpassword': True}, csrfContext)
        else:
            print("good account. backend rendering search engine.")
            # playlisturl is rendered "safe" so the quotes around the json
            # retrieval are handled, whereas email is just a string, so no safe
            # rendering
            return render_to_response('artists/search.html', {'email': email, 'playlisturl': playlisturl}, csrfContext)
    except:
        print("backend could not find corresponding account registered to " + email)
        return render_to_response('artists/login.html', {'invalidemail': True, 'email': email}, csrfContext)

# this function is called via url /signup/
def signup(request):
    print("backend heard that new user wants to sign up")
    csrfContext = RequestContext(request)
    return render_to_response('artists/signup.html', csrfContext)

def verifynewuser(request):
    csrfContext = RequestContext(request)
    print("backend verifying new user's info")
    email = request.POST.get('email')
    password = request.POST.get('password')
    print "email: " + email
    print "password: " + password
    emailregex = re.compile("[a-zA-Z0-9_\.\+\-]+@[a-zA-Z0-9_\.\+\-]+\.[a-zA-Z]{3}$")
    passwordregex = re.compile("[a-zA-Z0-9_\.]")
    emailmatch = emailregex.match(email)
    passwordmatch = passwordregex.match(password)
    print emailmatch
    print passwordmatch

    if len(email) == 0 or emailmatch is None:
        print "bad email input"
        return render_to_response('artists/signup.html', {'invalidemail': True, 'email': email}, csrfContext)
    elif len(password) == 0 or passwordmatch is None:
        print "bad password input"
        return render_to_response('artists/signup.html', {'invalidpassword': True}, csrfContext)

    # now check uniqueness of email
    emailused = False
    for account in Account.objects.raw('SELECT * FROM artists_Account WHERE email_Text = %s', [email]):
        emailused = True

    if (emailused):
        print "email already in use"
        return render_to_response('artists/signup.html', {'emailused': true, 'email': email}, csrfContext)
    else:
        newaccount = Account(email_text=email, password_text=password)
        newaccount.save()
        return render_to_response('artists/search.html', {'email': email}, csrfContext)

def login(request):
    # the login template is the first one generated, so be sure to render the csrf with it so POST's work
    csrfContext = RequestContext(request)
    return render_to_response('artists/login.html', csrfContext)

def loginForShare(request):
    url = request.build_absolute_uri()
    #print(url)
    # all attempts at sharing a playlist rely on the shareplaylist keyword in the url
    sharetarget = 'shareplaylist/'
    index = url.index(sharetarget)
    #print(index);
    # parse the url of the specific playlist from the entire url
    # also necessary to append quotations so that injection into javascript works
    playlisturl = url[(index + len(sharetarget)):]
    playlisturl = '"' + playlisturl + '"'
    print("playlist url: " + playlisturl)
    # the login template is the first one generated, so be sure to render the csrf with it so POST's work
    csrfContext = RequestContext(request)
    return render_to_response('artists/login.html', {'playlisturl': playlisturl}, csrfContext)

# this function is called whenver url pattern with artist/ajax/get/ is entered
def ajaxGet(request):
    print("my ajax view running")
    subject = request.GET.get('text')
    if subject is None:
        print("Backend couldn't find GET subject")
        return HttpResponseBadRequest()
    else:
        print("ajaxGet subject: " + subject)
        if subject == 'getPlaylists':
            return getPlaylists(request)
        elif subject =='getSpecificPlaylist':
            return getSpecificPlaylist(request)
        elif subject == 'startListening':
            return HttpResponseRedirect('/artists/search.html')

# gets all playlists corresponding to a particular user's email
def getPlaylists(request):
    print("running getPlaylists")
    email = request.GET.get('useremail')
    print("checking for " + email + "'s playlists")
    try:
        data = [] #this array will store each playlist's data

        #get all url's (with corresponding playlists) that belong to the user with email
        for x in URL.objects.raw('SELECT * FROM artists_URL WHERE user_email = %s', [email]):
            print(x)
            print("url text: " + x.url_text)
            # for particular url, get the corresponding playlist
            foundplaylist = x.playlist_set.get(url=x)
            print(foundplaylist)
            songs = [] #this array will store each song in the playlist
            # for the corresponding playlist, get the songs that correspond to that
            for y in range(0, len(foundplaylist.song_set.all())):
                print(foundplaylist.song_set.all()[y])
                songs.append(foundplaylist.song_set.all()[y])

            #convert the collected data into json format so that javascript can easily access it
            urljson = serializers.serialize('json', [x])
            playlistjson = serializers.serialize('json', [foundplaylist])
            songsjson = serializers.serialize('json', songs)

            print(urljson)
            print(playlistjson)
            print(songsjson)

            #place each json-formatted data placeholder into an array for this playlist
            json = []
            json.append(urljson)
            json.append(playlistjson)
            json.append(songsjson)

            #keep track of this playlist
            data.append(json)

        #return json format of all playlists
        return HttpResponse({simplejson.dumps(data)})
    except Exception, err:
        print traceback.format_exc()
        print("url could not be found")
    return HttpResponse("User's playlist's could not be found");

def getSpecificPlaylist(request):
    print("running getSpecificPlaylist")
    url = request.GET.get('url')
    print("url: " + url)
    urlref = URL.objects.get(url_text=url);
    playlist = urlref.playlist_set.get()
    data = [] # array to store all json data from playlist
    songs = [] # array to store all songs in playlist
    # for the corresponding playlist, get the songs that correspond to that
    for y in range(0, len(playlist.song_set.all())):
        songs.append(playlist.song_set.all()[y])

    #convert the collected data into json format so that javascript can easily access it
    urljson = serializers.serialize('json', [urlref])
    playlistjson = serializers.serialize('json', [playlist])
    songsjson = serializers.serialize('json', songs)

    print(urljson)
    print(playlistjson)
    print(songsjson)

    #place each json-formatted data placeholder into an array for this playlist
    json = []
    json.append(urljson)
    json.append(playlistjson)
    json.append(songsjson)

    #keep track of this playlist
    data.append(json)

    #return json format of all playlists
    return HttpResponse({simplejson.dumps(data)})

################################################################################

# re-route POST requests from frontend
def ajaxPost(request):
    subject = request.POST.get('text')
    if subject is None:
        print("Backend couldn't find POST subject")
        return HttpResponseBadRequest()
    else:
        print("ajaxPost subject: " + subject)
        if subject == 'savePlaylist':
            return savePlaylist(request, rand_digits)
        elif subject == 'deletePlaylist':
            return deletePlaylist(request)

# save a playlist
def savePlaylist(request, rand_digits):
    print("running savePlaylist, url below")
    url = request.POST.get('url')
    print(url)
    if url is not None:
        print(url.__len__())
    email = request.POST.get('email')
    print("email: " + email)
    playlist = request.POST.get('playlist')
    print("received playlist: " + playlist)
    songs = request.POST.get('songs')
    data = json.loads(songs)
    print("playlist length: " + str(len(data)))
    numurls = URL.objects.count()
    print("numurls: " + str(numurls))

    # minimize collisions where we have to generate another random url
    if numurls > ((math.pow(numpossibles, rand_digits[0])) / 2):
        rand_digits[0] += 1
    print("url length: " + str(rand_digits[0]))

    # if the playlist is new and isn't in the database yet
    if (url is None) or (url.__len__() == 0):
        goodsave = False
        while goodsave == False:
            try:
                randomurl = urlGenerator(rand_digits[0])
                playlisturl = URL(url_text=randomurl, user_email=email)
                playlisturl.save()
                goodsave = True
            except IntegrityError, e:
                print("URL was not unique, generating another one...")

        print("successfully found random url: " + randomurl)
        playlist = Playlist(playlist_text=playlist, url=playlisturl, numsongs=len(data))
        playlist.save()

        #now that the playlist is saved, insert the songs to complete relationship
        for x in range (len(data)):
            print(data[x])
            song = Song(song_id=data[x]['id'], song_name=data[x]['name'], artist_name=data[x]['artist'], album_name=data[x]['album'])
            song.save()
            song.playlist.add(playlist)

        print(playlist.song_set.all())

        # return the url assigned to the playlist
        return HttpResponse({simplejson.dumps(randomurl)})

    # the playlist already exists
    else:
        cursor = connection.cursor()
        print("backend overwriting prior version of playlist")
        for x in URL.objects.raw('SELECT * FROM artists_URL WHERE user_email = %s AND url_text=%s', [email, url]):
            print(x)
            playlistref = x.playlist_set.get(playlist_text=playlist)
            print(playlistref)
            # remove all songs in the playlist
            for y in playlistref.song_set.all():
                print(y)
                y.delete()
            # re-enter songs from new version
            counter = 0
            for z in range (len(data)):
                print(data[z])
                song = Song(song_id=data[z]['id'], song_name=data[z]['name'], artist_name=data[z]['artist'], album_name=data[z]['album'])
                song.save()
                song.playlist.add(playlistref)
                counter = counter + 1
            playlistref.numsongs = counter;
            playlistref.save()
        return HttpResponse("successful overwrite, no new url")

# this function generates a random string of default size 6 from the alphabet and digits - accounting for both
# lower and upper case letters, there are 62 possible choices for a single char in the URL
def urlGenerator(size=6, chars=string.ascii_uppercase + string.ascii_lowercase + string.digits):
    return ''.join(random.choice(chars) for x in range(size))

def printJSONEntry(entry):
    for key, value in entry.iteritems():
        print key, value

def deletePlaylist(request):
    print("running deletePlaylist")
    email = request.POST.get('email')
    print("email: " + email)
    playlist = request.POST.get('playlist')
    print("playlist: " + playlist)
    url = request.POST.get('url')
    print("url: " + url)
    # get the corresponding URL object
    for x in URL.objects.raw('SELECT * FROM artists_URL WHERE user_email = %s AND url_text=%s', [email, url]):
        urlref = x;
        # get playlist reference
        playlistref = x.playlist_set.get(playlist_text=playlist)
        # remove all songs that belong to that playlist
        for y in Song.objects.filter(playlist=playlistref):
            y.delete()

        playlistref.delete()
        urlref.delete()
    return HttpResponse("deleted playlist")
