// Compiled to static/js/i18n.js — must load before common.js / login.js /
// manager.js / employee.js, since they all call t() at runtime.

type Lang = "en" | "fr" | "ar";

const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    app_name: "Daily Dispatch",
    live: "Live",
    connecting: "connecting",
    reconnecting: "reconnecting…",
    sign_out: "Sign out",
    signed_in_as: "Signed in as",

    login_title: "Sign in",
    username_label: "Username",
    password_label: "Password",
    sign_in_button: "Sign in",
    login_hint: "Manager and employee accounts are set up by whoever manages this app. If you don't have a username and password yet, ask them.",
    login_error_generic: "Incorrect username or password.",
    show_password: "Show password",
    hide_password: "Hide password",

    manager_heading: "Manager board",
    tab_assign: "Assign tasks",
    tab_locations: "Locations",
    live_map_heading: "Live map",
    live_map_subtitle: "employee locations & travel planning",
    pick_hint: "Click a location pin on the map to set it as:",
    pick_from: "Pickup (From)",
    pick_to: "Drop-off (To)",
    new_task_heading: "New task",
    employee_label: "Employee",
    employee_placeholder: "Choose an employee…",
    person_label: "Person to pick up",
    person_placeholder: "e.g. Amb. J. Dubois",
    from_label: "From",
    to_label: "To",
    from_placeholder: "From…",
    to_placeholder: "To…",
    date_label: "Date",
    time_label: "Time",
    notes_label: "Notes (optional)",
    notes_placeholder: "Flight number, car, phone…",
    assign_button: "Assign task",
    board_heading: "Today's board",
    th_employee: "Employee",
    th_person: "Person",
    th_route: "Route",
    th_time: "Time",
    th_status: "Status",
    th_updated: "Updated",
    board_loading: "Loading…",
    board_empty: "No tasks assigned for this date yet.",
    locations_add_heading: "Add a location",
    name_label: "Name",
    name_placeholder: "e.g. Ramada Tunis",
    lat_label: "Latitude",
    lng_label: "Longitude",
    save_location_button: "Save location",
    locations_hint: "Click anywhere on the map to drop a pin, then save. New locations show up in the From/To lists immediately for everyone.",
    all_locations_heading: "All locations",
    roster_live: "Live",
    roster_at_agency: "At agency",
    popup_assign_button: "Assign a task",
    popup_not_checked_in: "Not checked in · showing agency location",
    delete_confirm: "Delete this task?",
    current_location_live: "current location (live)",
    current_location_agency: "current location (at agency)",

    my_tasks_heading: "My tasks",
    employee_subtitle: "Updates the moment the manager assigns or changes something — no need to refresh.",
    location_banner_text: "Share your live location so dispatch can see where you are.",
    location_banner_enable: "Enable",
    location_banner_denied: "Location sharing is off — tap Enable and allow access when your browser asks.",
    location_banner_unsupported: "This device can't share its location.",
    location_modal_title: "Share your location?",
    location_modal_body: "Turn on live location so dispatch can see where you are, and so you can see how far you are from your next pickup.",
    location_modal_activate: "Activate",
    location_modal_later: "Not now",
    pickup_label: "Pick up",
    note_prefix: "Note:",
    open_route_maps: "Open route in Maps",
    mark_en_route: "Mark en route",
    mark_done: "Mark done",
    last_updated_prefix: "Last updated",
    distance_to_destination: "≈ {n} km to destination",
    waiting_location_note: "Waiting for your location — enable sharing above to see it here.",
    empty_tasks: "No tasks assigned for today yet. This page updates the moment the manager adds one.",
    you_are_here: "You are here",

    status_assigned: "Assigned",
    status_en_route: "En route",
    status_done: "Done",
    status_cancelled: "Cancelled",

    time_just_now: "just now",
    time_seconds_ago: "{n}s ago",
    time_minutes_ago: "{n}m ago",
    time_hours_ago: "{n}h ago",

    delete_task: "Delete task",
    popup_live_updated: "Live · updated {time}",
    task_assigned: "Task assigned.",
    could_not_assign: "Could not assign task.",
    could_not_update_status: "Could not update status.",
    could_not_delete: "Could not delete task.",
    pick_point_hint: "Pick a point on the map and give it a name.",
    location_saved: "Location saved.",
    could_not_save_location: "Could not save location.",
    swap_aria_label: "Swap from and to",
    could_not_update_task: "Could not update task.",

    delegation_heading: "Your drivers",
    delegation_map_subtitle: "where your driver is right now",
    delegation_board_heading: "Today's pickups",
    call_button: "Call",
    directions_button: "Directions",
    location_filter_all: "All locations",
    location_filter_label: "Filter by location",
  },

  fr: {
    app_name: "Daily Dispatch",
    live: "En direct",
    connecting: "connexion…",
    reconnecting: "reconnexion…",
    sign_out: "Déconnexion",
    signed_in_as: "Connecté en tant que",

    login_title: "Connexion",
    username_label: "Nom d'utilisateur",
    password_label: "Mot de passe",
    sign_in_button: "Se connecter",
    login_hint: "Les comptes du responsable et des employés sont créés par l'administrateur de l'application. Si vous n'avez pas encore d'identifiants, contactez-le.",
    login_error_generic: "Nom d'utilisateur ou mot de passe incorrect.",
    show_password: "Afficher le mot de passe",
    hide_password: "Masquer le mot de passe",

    manager_heading: "Tableau du responsable",
    tab_assign: "Attribuer les tâches",
    tab_locations: "Lieux",
    live_map_heading: "Carte en direct",
    live_map_subtitle: "localisation des employés et planification des trajets",
    pick_hint: "Cliquez sur un lieu de la carte pour le définir comme :",
    pick_from: "Départ",
    pick_to: "Arrivée",
    new_task_heading: "Nouvelle tâche",
    employee_label: "Employé",
    employee_placeholder: "Choisissez un employé…",
    person_label: "Personne à récupérer",
    person_placeholder: "ex. Amb. J. Dubois",
    from_label: "Départ",
    to_label: "Arrivée",
    from_placeholder: "Départ…",
    to_placeholder: "Arrivée…",
    date_label: "Date",
    time_label: "Heure",
    notes_label: "Remarques (facultatif)",
    notes_placeholder: "N° de vol, voiture, téléphone…",
    assign_button: "Attribuer la tâche",
    board_heading: "Tableau du jour",
    th_employee: "Employé",
    th_person: "Personne",
    th_route: "Trajet",
    th_time: "Heure",
    th_status: "Statut",
    th_updated: "Mis à jour",
    board_loading: "Chargement…",
    board_empty: "Aucune tâche attribuée pour cette date.",
    locations_add_heading: "Ajouter un lieu",
    name_label: "Nom",
    name_placeholder: "ex. Ramada Tunis",
    lat_label: "Latitude",
    lng_label: "Longitude",
    save_location_button: "Enregistrer le lieu",
    locations_hint: "Cliquez n'importe où sur la carte pour placer un repère, puis enregistrez. Les nouveaux lieux apparaissent aussitôt dans les listes Départ/Arrivée pour tout le monde.",
    all_locations_heading: "Tous les lieux",
    roster_live: "En direct",
    roster_at_agency: "À l'agence",
    popup_assign_button: "Attribuer une tâche",
    popup_not_checked_in: "Non connecté · position de l'agence affichée",
    delete_confirm: "Supprimer cette tâche ?",
    current_location_live: "position actuelle (en direct)",
    current_location_agency: "position actuelle (à l'agence)",

    my_tasks_heading: "Mes tâches",
    employee_subtitle: "Mis à jour dès que le responsable attribue ou modifie une tâche — pas besoin d'actualiser.",
    location_banner_text: "Partagez votre position pour que le répartiteur sache où vous êtes.",
    location_banner_enable: "Activer",
    location_banner_denied: "Le partage de position est désactivé — appuyez sur Activer et autorisez l'accès quand le navigateur le demande.",
    location_banner_unsupported: "Cet appareil ne peut pas partager sa position.",
    location_modal_title: "Partager votre position ?",
    location_modal_body: "Activez la position en direct pour que le répartiteur sache où vous êtes, et pour voir vous-même la distance jusqu'à votre prochaine prise en charge.",
    location_modal_activate: "Activer",
    location_modal_later: "Plus tard",
    pickup_label: "Récupération",
    note_prefix: "Remarque :",
    open_route_maps: "Ouvrir l'itinéraire dans Maps",
    mark_en_route: "Marquer en route",
    mark_done: "Marquer terminée",
    last_updated_prefix: "Dernière mise à jour",
    distance_to_destination: "≈ {n} km jusqu'à la destination",
    waiting_location_note: "En attente de votre position — activez le partage ci-dessus pour la voir ici.",
    empty_tasks: "Aucune tâche attribuée aujourd'hui pour l'instant. Cette page se met à jour dès que le responsable en ajoute une.",
    you_are_here: "Vous êtes ici",

    status_assigned: "Attribuée",
    status_en_route: "En route",
    status_done: "Terminée",
    status_cancelled: "Annulée",

    time_just_now: "à l'instant",
    time_seconds_ago: "il y a {n}s",
    time_minutes_ago: "il y a {n}min",
    time_hours_ago: "il y a {n}h",

    delete_task: "Supprimer la tâche",
    popup_live_updated: "En direct · mis à jour {time}",
    task_assigned: "Tâche attribuée.",
    could_not_assign: "Impossible d'attribuer la tâche.",
    could_not_update_status: "Impossible de mettre à jour le statut.",
    could_not_delete: "Impossible de supprimer la tâche.",
    pick_point_hint: "Choisissez un point sur la carte et donnez-lui un nom.",
    location_saved: "Lieu enregistré.",
    could_not_save_location: "Impossible d'enregistrer le lieu.",
    swap_aria_label: "Inverser départ et arrivée",
    could_not_update_task: "Impossible de mettre à jour la tâche.",

    delegation_heading: "Vos chauffeurs",
    delegation_map_subtitle: "où se trouve votre chauffeur en ce moment",
    delegation_board_heading: "Trajets du jour",
    call_button: "Appeler",
    directions_button: "Itinéraire",
    location_filter_all: "Tous les lieux",
    location_filter_label: "Filtrer par lieu",
  },

  ar: {
    app_name: "Daily Dispatch",
    live: "مباشر",
    connecting: "جارٍ الاتصال",
    reconnecting: "إعادة الاتصال…",
    sign_out: "تسجيل الخروج",
    signed_in_as: "مسجّل الدخول باسم",

    login_title: "تسجيل الدخول",
    username_label: "اسم المستخدم",
    password_label: "كلمة المرور",
    sign_in_button: "دخول",
    login_hint: "حسابات المدير والموظفين يُنشئها مسؤول التطبيق. إذا لم يكن لديك اسم مستخدم وكلمة مرور بعد، تواصل معه.",
    login_error_generic: "اسم المستخدم أو كلمة المرور غير صحيحة.",
    show_password: "إظهار كلمة المرور",
    hide_password: "إخفاء كلمة المرور",

    manager_heading: "لوحة المدير",
    tab_assign: "إسناد المهام",
    tab_locations: "المواقع",
    live_map_heading: "الخريطة المباشرة",
    live_map_subtitle: "مواقع الموظفين وتخطيط الرحلات",
    pick_hint: "اضغط على موقع في الخريطة لتحديده كـ:",
    pick_from: "الانطلاق",
    pick_to: "الوصول",
    new_task_heading: "مهمة جديدة",
    employee_label: "الموظف",
    employee_placeholder: "اختر موظفًا…",
    person_label: "الشخص المطلوب اصطحابه",
    person_placeholder: "مثال: السفير ج. دوبوا",
    from_label: "من",
    to_label: "إلى",
    from_placeholder: "من…",
    to_placeholder: "إلى…",
    date_label: "التاريخ",
    time_label: "الوقت",
    notes_label: "ملاحظات (اختياري)",
    notes_placeholder: "رقم الرحلة، السيارة، الهاتف…",
    assign_button: "إسناد المهمة",
    board_heading: "لوحة اليوم",
    th_employee: "الموظف",
    th_person: "الشخص",
    th_route: "المسار",
    th_time: "الوقت",
    th_status: "الحالة",
    th_updated: "آخر تحديث",
    board_loading: "جارٍ التحميل…",
    board_empty: "لا توجد مهام مُسندة لهذا التاريخ بعد.",
    locations_add_heading: "إضافة موقع",
    name_label: "الاسم",
    name_placeholder: "مثال: راديسون تونس",
    lat_label: "خط العرض",
    lng_label: "خط الطول",
    save_location_button: "حفظ الموقع",
    locations_hint: "اضغط في أي مكان على الخريطة لوضع علامة، ثم احفظها. المواقع الجديدة تظهر فورًا في قوائم من/إلى للجميع.",
    all_locations_heading: "كل المواقع",
    roster_live: "مباشر",
    roster_at_agency: "في الوكالة",
    popup_assign_button: "إسناد مهمة",
    popup_not_checked_in: "غير متصل · يظهر موقع الوكالة",
    delete_confirm: "حذف هذه المهمة؟",
    current_location_live: "الموقع الحالي (مباشر)",
    current_location_agency: "الموقع الحالي (في الوكالة)",

    my_tasks_heading: "مهامي",
    employee_subtitle: "تتحدث فور قيام المدير بإسناد أو تعديل مهمة — لا حاجة للتحديث.",
    location_banner_text: "شارك موقعك المباشر ليتمكن التنسيق من معرفة مكانك.",
    location_banner_enable: "تفعيل",
    location_banner_denied: "مشاركة الموقع متوقفة — اضغط على تفعيل واسمح بالوصول عندما يطلب المتصفح ذلك.",
    location_banner_unsupported: "هذا الجهاز لا يمكنه مشاركة موقعه.",
    location_modal_title: "هل تريد مشاركة موقعك؟",
    location_modal_body: "فعّل الموقع المباشر ليتمكن التنسيق من معرفة مكانك، ولتتمكن أنت أيضًا من معرفة المسافة المتبقية حتى وجهتك القادمة.",
    location_modal_activate: "تفعيل",
    location_modal_later: "ليس الآن",
    pickup_label: "الاصطحاب",
    note_prefix: "ملاحظة:",
    open_route_maps: "افتح المسار في الخرائط",
    mark_en_route: "بدء التنقل",
    mark_done: "تحديد كمنجزة",
    last_updated_prefix: "آخر تحديث",
    distance_to_destination: "≈ {n} كم حتى الوجهة",
    waiting_location_note: "بانتظار موقعك — فعّل المشاركة أعلاه لرؤيته هنا.",
    empty_tasks: "لا توجد مهام مُسندة اليوم بعد. تتحدث هذه الصفحة فور إضافة المدير لمهمة.",
    you_are_here: "أنت هنا",

    status_assigned: "مُسندة",
    status_en_route: "في الطريق",
    status_done: "منجزة",
    status_cancelled: "ملغاة",

    time_just_now: "الآن",
    time_seconds_ago: "قبل {n}ث",
    time_minutes_ago: "قبل {n}د",
    time_hours_ago: "قبل {n}س",

    delete_task: "حذف المهمة",
    popup_live_updated: "مباشر · تحديث {time}",
    task_assigned: "تم إسناد المهمة.",
    could_not_assign: "تعذر إسناد المهمة.",
    could_not_update_status: "تعذر تحديث الحالة.",
    could_not_delete: "تعذر حذف المهمة.",
    pick_point_hint: "اختر نقطة على الخريطة وأعطها اسمًا.",
    location_saved: "تم حفظ الموقع.",
    could_not_save_location: "تعذر حفظ الموقع.",
    swap_aria_label: "تبديل من وإلى",
    could_not_update_task: "تعذر تحديث المهمة.",

    delegation_heading: "سائقوك",
    delegation_map_subtitle: "أين يوجد سائقك الآن",
    delegation_board_heading: "رحلات اليوم",
    call_button: "اتصال",
    directions_button: "الاتجاهات",
    location_filter_all: "كل المواقع",
    location_filter_label: "التصفية حسب الموقع",
  },
};

const LANG_STORAGE_KEY = "dispatch_lang";

function getSavedLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === "en" || saved === "fr" || saved === "ar") return saved;
  } catch (_) {
    /* localStorage unavailable (private mode, etc.) — fall back below */
  }
  return "en";
}

let currentLang: Lang = getSavedLang();

function t(key: string, vars?: Record<string, string | number>): string {
  const dict = TRANSLATIONS[currentLang] || TRANSLATIONS.en;
  let text = dict[key] ?? TRANSLATIONS.en[key] ?? key;
  if (vars) {
    Object.keys(vars).forEach((k) => {
      text = text.replace(`{${k}}`, String(vars[k]));
    });
  }
  return text;
}

function localeTag(): string {
  return currentLang === "ar" ? "ar-TN" : currentLang === "fr" ? "fr-FR" : "en-US";
}

function applyStaticTranslations() {
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    if (key) el.textContent = t(key);
  });
  document.querySelectorAll<HTMLInputElement>("[data-i18n-placeholder]").forEach((el) => {
    const key = el.dataset.i18nPlaceholder;
    if (key) el.placeholder = t(key);
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-aria-label]").forEach((el) => {
    const key = el.dataset.i18nAriaLabel;
    if (key) el.setAttribute("aria-label", t(key));
  });
}

function applyDirection() {
  document.documentElement.lang = currentLang;
  document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
}

function setLang(lang: Lang) {
  currentLang = lang;
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch (_) {
    /* ignore */
  }
  applyDirection();
  applyStaticTranslations();
  window.dispatchEvent(new CustomEvent("langchange"));
}

function initLangSwitcher() {
  applyDirection();
  const select = document.getElementById("lang-select") as HTMLSelectElement | null;
  if (!select) return;
  select.value = currentLang;
  select.addEventListener("change", () => setLang(select.value as Lang));
}

// Runs immediately: script tags sit at the end of <body>, so the DOM is
// already parsed by the time this executes.
initLangSwitcher();
applyStaticTranslations();
