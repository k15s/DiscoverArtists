from django.conf.urls import patterns, include, url

# Uncomment the next two lines to enable the admin:
# from django.contrib import admin
# admin.autodiscover()

urlpatterns = patterns('',
    # url(r'^$', 'DiscoverArtists.views.home', name='home'),
    # url(r'^DiscoverArtists/', include('DiscoverArtists.foo.urls')),

    # Uncomment the admin/doc line below to enable admin documentation:
    # url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    # url(r'^admin/', include(admin.site.urls)),

    # when url is "artists/" tell django to include urls.py in artists folder
    # and append them on to "artists/"
    #url(r'^artists/', include('artists.urls', namespace="artists")),
    url(r'^', include('artists.urls', namespace="artists")),
)
