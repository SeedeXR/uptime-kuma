import { h } from "vue";
// Import ONLY the icons we use so the bundler tree-shakes the rest of Lucide away.
// (A wildcard `import * as lucide` + dynamic lookup would bundle all ~1500 icons.)
import {
    ChevronDown, ArrowUpCircle, MoveVertical, Award, Megaphone, BadgeCheck,
    Check, CircleCheck, Files, Settings, Copy, SquarePen, CircleAlert,
    TriangleAlert, ExternalLink, Eye, EyeOff, File, Filter, Folder, FolderOpen,
    HeartPulse, Images, Info, Link, List, Pause, Pencil, Play, Plus, CirclePlus,
    CircleHelp, Save, Search, LogOut, LoaderCircle, LayoutList, Gauge, X, CircleX,
    Trash2, Undo2, Unlink, Upload, Wrench, Circle,
    ChevronLeft, ChevronRight, Menu,
} from "lucide-vue-next";

// Seede XR uses Lucide icons. This wrapper keeps the existing
// <font-awesome-icon icon="name" /> API so ~110 call sites don't change.
// Map: Font Awesome (kebab) name -> Lucide component.
const iconMap = {
    "angle-down": ChevronDown,
    "arrow-alt-circle-up": ArrowUpCircle,
    "arrows-alt-v": MoveVertical,
    "award": Award,
    "bullhorn": Megaphone,
    "certificate": BadgeCheck,
    "check": Check,
    "check-circle": CircleCheck,
    "chevron-down": ChevronDown,
    "chevron-left": ChevronLeft,
    "chevron-right": ChevronRight,
    "bars": Menu,
    "clone": Files,
    "cog": Settings,
    "copy": Copy,
    "edit": SquarePen,
    "exclamation-circle": CircleAlert,
    "exclamation-triangle": TriangleAlert,
    "external-link-square-alt": ExternalLink,
    "eye": Eye,
    "eye-slash": EyeOff,
    "file": File,
    "filter": Filter,
    "folder": Folder,
    "folder-open": FolderOpen,
    "heartbeat": HeartPulse,
    "images": Images,
    "info-circle": Info,
    "link": Link,
    "list": List,
    "pause": Pause,
    "pen": Pencil,
    "play": Play,
    "plus": Plus,
    "plus-circle": CirclePlus,
    "question-circle": CircleHelp,
    "save": Save,
    "search": Search,
    "sign-out-alt": LogOut,
    "spinner": LoaderCircle,
    "stream": LayoutList,
    "tachometer-alt": Gauge,
    "times": X,
    "times-circle": CircleX,
    "trash": Trash2,
    "undo": Undo2,
    "unlink": Unlink,
    "upload": Upload,
    "wrench": Wrench,
};

const sizeMap = {
    "xs": "0.75em",
    "sm": "0.875em",
    "lg": "1.33em",
    "2x": "2em",
    "3x": "3em",
};

export const FontAwesomeIcon = {
    name: "FontAwesomeIcon",
    inheritAttrs: false,
    props: {
        icon: { type: [ String, Array ], default: "" },
        spin: { type: Boolean, default: false },
        size: { type: String, default: null },
        fixedWidth: { type: Boolean, default: false },
    },
    render() {
        // icon may be "cog" or an FA array like ["fas", "cog"] — use the last segment
        const name = Array.isArray(this.icon) ? this.icon[this.icon.length - 1] : this.icon;
        const Comp = iconMap[name] || Circle;

        const dimension = (this.size && sizeMap[this.size]) || "1em";
        const spinning = this.spin || name === "spinner";

        return h(Comp, {
            ...this.$attrs,
            class: [ this.$attrs.class, "seede-icon", spinning ? "seede-icon-spin" : "" ],
            width: dimension,
            height: dimension,
        });
    },
};
