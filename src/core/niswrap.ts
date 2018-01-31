import {NISClass} from './classes/NISClass';
var _instance = NISClass.getInstance();
if (!_instance.bootstrapped){
    _instance.bootstrap();
}
module.exports = _instance;