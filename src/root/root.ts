import { refreshCart } from "./payment/cart";
import { library, dom } from '@fortawesome/fontawesome-svg-core';
import { faTrash } from '@fortawesome/free-solid-svg-icons/faTrash';
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons/faShoppingCart';
import { faChevronDown } from '@fortawesome/free-solid-svg-icons/faChevronDown';
import { faChevronLeft } from '@fortawesome/free-solid-svg-icons/faChevronLeft';
import { faGear } from '@fortawesome/free-solid-svg-icons/faGear';
import {faEyeDropper} from '@fortawesome/free-solid-svg-icons/faEyeDropper';
import {faPlus} from '@fortawesome/free-solid-svg-icons/faPlus';
import {faMinus} from '@fortawesome/free-solid-svg-icons/faMinus';
import {faScrewdriverWrench} from '@fortawesome/free-solid-svg-icons/faScrewdriverWrench';
import {faDownload} from '@fortawesome/free-solid-svg-icons/faDownload';
import {faRotateLeft} from '@fortawesome/free-solid-svg-icons/faRotateLeft';
import {faRotateRight} from '@fortawesome/free-solid-svg-icons/faRotateRight';
import {faXmark} from '@fortawesome/free-solid-svg-icons/faXmark';
import {faSpinner} from '@fortawesome/free-solid-svg-icons/faSpinner';
import {faPlugCircleXmark} from '@fortawesome/free-solid-svg-icons/faPlugCircleXmark';
import {faTerminal} from '@fortawesome/free-solid-svg-icons/faTerminal';
import {faExclamationCircle} from '@fortawesome/free-solid-svg-icons/faExclamationCircle';
import {faPenToSquare} from '@fortawesome/free-solid-svg-icons/faPenToSquare';
import {faSquareBinary} from '@fortawesome/free-solid-svg-icons/faSquareBinary';
import {faUpload} from '@fortawesome/free-solid-svg-icons/faUpload';
import {faEllipsisVertical} from '@fortawesome/free-solid-svg-icons/faEllipsisVertical';
import {faCompass} from '@fortawesome/free-solid-svg-icons/faCompass';
import {faGraduationCap} from '@fortawesome/free-solid-svg-icons/faGraduationCap';
import {faAngleRight} from '@fortawesome/free-solid-svg-icons/faAngleRight';
import {faAngleLeft} from '@fortawesome/free-solid-svg-icons/faAngleLeft';
import {faCircleInfo} from '@fortawesome/free-solid-svg-icons/faCircleInfo';
import { faFlag } from '@fortawesome/free-solid-svg-icons/faFlag';
import { faRepeat } from '@fortawesome/free-solid-svg-icons/faRepeat';
import { faTableList } from '@fortawesome/free-solid-svg-icons/faTableList';
import {faEye } from '@fortawesome/free-solid-svg-icons/faEye';
import {faRobot} from '@fortawesome/free-solid-svg-icons/faRobot';
import {faTruckMonster} from '@fortawesome/free-solid-svg-icons/faTruckMonster';
import {faX} from '@fortawesome/free-solid-svg-icons/faX';
import {faCircleXmark} from '@fortawesome/free-solid-svg-icons/faCircleXmark';
import {faGears} from '@fortawesome/free-solid-svg-icons/faGears';
import { faBoxesStacked } from '@fortawesome/free-solid-svg-icons/faBoxesStacked';
import { faCheck } from '@fortawesome/free-solid-svg-icons/faCheck';
import { faArrowsRotate } from '@fortawesome/free-solid-svg-icons/faArrowsRotate';
import { faMicrochip } from '@fortawesome/free-solid-svg-icons/faMicrochip';

library.add(faMicrochip, faCheck, faArrowsRotate, faBoxesStacked, faCircleXmark, faX, faGears, faEye, faRobot, faTruckMonster, faRepeat, faTableList, faFlag, faAngleLeft, faTrash, faShoppingCart, faAngleLeft, faCircleInfo, faAngleRight, faGraduationCap, faCompass, faEllipsisVertical, faUpload, faSquareBinary, faPenToSquare, faExclamationCircle, faTerminal, faPlugCircleXmark, faSpinner, faXmark, faRotateRight, faRotateLeft, faDownload, faScrewdriverWrench, faMinus, faPlus, faEyeDropper, faGear, faChevronLeft, faChevronDown);
dom.watch(); // Replaces <i> tags with SVGs
refreshCart()

