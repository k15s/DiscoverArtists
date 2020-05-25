**Maintenance**
+ python manage.py runserver
+ kill -9 4189 (to kill django server if it's not responding)
+ ps aux | grep -i manage
+ Note the process id (pid)  for our "manage.py runserver" process which should be the second column from the left.
+ ./manage.py sqlclear artists | ./manage.py dbshell //drops all tables
+ python manage.py syncdb
+ python manage.py shell

**Search.js GET requests**
+ GET text: 'getPlaylists', useremail: email //frontend request for playlists belonging to user
+ POST text: 'savePlaylist', 'email': email, 'playlist': playlistname, 'songs': JSON.stringify(songs)
+ POST text: 'deletePlaylist', 
+ for God's sake, remember to handle CSRF verifications for AJAX requests

**URLS**
+ http://localhost:8000/artists/login/
+ http://localhost:8000
+ http://localhost:8000/search/

**ORM Techniques**
+ from artists.models import Account, URL, Playlist, Song
+ URL.objects.all() //get list of url objects in database

+ url1 = URL(url_text="www.google.com", user_email="gmail")
+ url1.save() //url1 object has been saved, now has an id, url_text, etc.
+ url1 = URL.objects.all().filter(id=1)
+ url1 = URL.objects.get(id=1)
+ url1 = URL.objects.get(url_text="www.google.com")
+ URL.objects.get(id=2).delete()
+ url2 = URL(user_email="gmail", url_text="www.yahoo.com")
+ URL.objects.get(user_email="gmail")

+ url1.playlist_set.all() //get playlists corresponding to url1
+ url1.playlist_set.create(playlist_text="testplaylist", url=url1, numsongs=1)
+ OR
+ playlist1 = Playlist(playlist_text="testplayyyylist", url=url1, numsongs=7)
+ playlist1.save()
+ playlist1 = url1.playlist_set.get(playlist_text="testplayyyylist")

+ playlist1.song_set.all()
+ song = Song(song_id="testid", song_name="testname", artist_name="testartist", album_name="testalbum")
+ song.save()
+ song.playlist.add(playlist1)
+ playlist1.song_set.all()

**Raw Sqlite Queries**

+ for x in URL.objects.raw('SELECT * FROM artists_URL'):
    + print(x)
