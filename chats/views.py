from multiprocessing import context
from django.shortcuts import render

# Create your views here.
def main_view(request):
    context = {}
    return render(request, 'chats/main.html', context=context)