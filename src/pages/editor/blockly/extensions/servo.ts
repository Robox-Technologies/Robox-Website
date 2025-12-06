export const servoCategory = {
    'kind': 'category',
    'name': 'Servos',
    "cssConfig": {
        "icon": "categoryIcon fa fa-arrows-rotate"
    },
    'categorystyle': 'movement_category',
    'contents': [
        {
            'kind': 'block',
            'type': 'servo_set_angle'
        },
        {
            'kind': 'block',
            'type': 'servo_rotate'
        },
        {
            'kind': 'block',
            'type': 'servo_get_angle'
        }
    ]
};