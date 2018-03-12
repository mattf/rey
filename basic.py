import random

CATEGORIES = [
    'backpack',
    'bag',
    'desk',
    'furniture',
    'table',
    'accessories',
    'handbag',
    'purse',
    'bottle',
    'dish',
    'food',
    'meal',
    'plate',
    'shop',
    'bowl',
    'tabletop'
]

def main(args):
    try:
        return {"labels":
                    map(lambda l: {'name': l,
                                    'confidence': random.uniform(.5,1)},
                        random.sample(CATEGORIES, 5))}
    except:
        return {"error": "Some failure, sorry"}
