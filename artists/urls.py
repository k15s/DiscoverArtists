from django.conf.urls import patterns, url, include
from django.views.generic import TemplateView
from artists import views

# the urls.py receives all frontend AJAX GET/POST requests and routes the
# correct 'views' method in response.

urlpatterns = patterns('',
        # empty addons/site name alone, go to login screen
        url(r'$^', 'artists.views.login', name="home"),
        url(r'^login/', 'artists.views.login', name="login"),
        url(r'^search/', 'artists.views.search', name="search"),
        url(r'^signup/', 'artists.views.signup', name="signup"),
        url(r'^verifynewuser/', 'artists.views.verifynewuser'),
        url(r'^shareplaylist/', 'artists.views.loginForShare'),
        url(r'^ajax/get/', 'artists.views.ajaxGet'),
        url(r'^ajax/post/', 'artists.views.ajaxPost'),
        url(r'^test/$', 'artists.views.index'),
)
