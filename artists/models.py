# database tables
# this models file exclusively belongs to the artists project - it sets the framework on which the sql
# database is constructed from

from django.db import models

# Create your models here.

class Account(models.Model):

    email_text = models.TextField()
    password_text = models.TextField()

    def __unicode__(self):
        return self.email_text + ", password: " + self.password_text

class URL(models.Model):
    url_text = models.URLField(unique=True)
    user_email = models.TextField()

    def __unicode__(self):
        return self.user_email + ": " + self.url_text

class Playlist(models.Model):
    playlist_text = models.TextField(unique=True)
    # positional argument - each playlist instance of model is related to a URL
    url = models.ForeignKey(URL)
    numsongs = models.IntegerField(default=0)

    def __unicode__(self):
        return self.playlist_text + ", length: " + str(self.numsongs)

class Song(models.Model):
    # song_id is defined by its youtube video id which is UNIQUE
    song_id = models.TextField()
    song_name = models.TextField()
    artist_name = models.TextField()
    album_name = models.TextField()
    playlist = models.ManyToManyField(Playlist);

    def __unicode__(self):
        return self.song_name + ", " + self.artist_name + ", " + self.album_name + ", " + self.song_id
