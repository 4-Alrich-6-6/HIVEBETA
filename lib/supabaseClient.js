(function () {
    const supabaseUrl = "https://rwijmgzxwyrktsjczpbp.supabase.co";
    const supabaseKey = "sb_publishable_8zB-1PnnV7wK7WMkC8qgQA_UD0fFfEC";

    if (!window.supabase) {
        console.error("Supabase library failed to load.");
        return;
    }

    window.hiveSupabase = window.supabase.createClient(
        supabaseUrl,
        supabaseKey
    );
})();
