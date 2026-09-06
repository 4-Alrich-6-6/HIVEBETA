const getSupabase = () => {
    if (!window.hiveSupabase) throw new Error("Supabase not ready.");
    return window.hiveSupabase;
};

const optionsEl = document.getElementById("positionOptions");

(async () => {
    try {
        const supabase = getSupabase();
        const { data: positions, error } = await supabase
            .from("POSITION")
            .select("posId, posName")
            .order("posId", { ascending: true });

        if (error || !positions?.length) {
            if (optionsEl) optionsEl.innerHTML = `<p style="color:red;">Failed to load options.</p>`;
            return;
        }

        if (optionsEl) optionsEl.innerHTML = "";

        positions.forEach((pos) => {
            const role = pos.posName.toLowerCase();
            const cssClass = role === "student" ? "option-professor" : "option-student";
            const route = role === "teacher"
                ? "../teacher/t.profiling.html"
                : "../student/s.profiling.html";

            const div = document.createElement("div");
            div.className = cssClass;
            const displayName = role === "teacher" ? "Instructor" : pos.posName;
            div.innerHTML = `<h2>${displayName}</h2>`;

            div.addEventListener("click", () => {
                localStorage.setItem("hive_posId", pos.posId);
                localStorage.setItem("hive_role", role);
                window.location.href = route;
            });

            if (optionsEl) optionsEl.appendChild(div);
        });

    } catch (err) {
        console.error(err);
        if (optionsEl) optionsEl.innerHTML = `<p style="color:red;">Supabase not available.</p>`;
    }
})();