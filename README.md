wsk -i action delete labels-basic
wsk -i action create labels-basic basic.py --web=true

wsk -i action invoke --blocking labels-basic

curl -k $(wsk -i action get labels-basic --url | tail -n1).json
