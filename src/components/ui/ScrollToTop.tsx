import { useState, useEffect } from "react";
import { ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = (e?: Event) => {
            // Check window scroll
            if (window.scrollY > 300) {
                setIsVisible(true);
                return;
            }

            // Check if the scroll event came from a specific container (e.g. main tag or specific div)
            const target = e?.target as HTMLElement;
            if (target && target.scrollTop !== undefined && target.scrollTop > 300) {
                setIsVisible(true);
                return;
            }

            setIsVisible(false);
        };

        // The true parameter sets capture to true to catch scroll events from any element
        window.addEventListener("scroll", toggleVisibility, true);

        return () => window.removeEventListener("scroll", toggleVisibility, true);
    }, []);

    const scrollToTop = () => {
        // Scroll the window
        window.scrollTo({
            top: 0,
            behavior: "smooth",
        });

        // Also scroll all potential scrollable containers to top
        const scrollableElements = document.querySelectorAll('.overflow-auto, .overflow-y-auto, main');
        scrollableElements.forEach(el => {
            if (el.scrollTop > 0) {
                el.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
            }
        });
    };

    return (
        <div className={cn(
            "fixed bottom-24 right-4 z-[99] transition-all duration-300 md:bottom-8 md:right-8",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-10 pointer-events-none"
        )}>
            <Button
                onClick={scrollToTop}
                size="icon"
                className="rounded-full w-12 h-12 shadow-lg gradient-primary text-white border-2 border-white/20 hover:scale-110 active:scale-95 transition-transform"
            >
                <ArrowUp className="w-6 h-6" />
            </Button>
        </div>
    );
}
