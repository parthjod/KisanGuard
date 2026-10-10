import { useRef, useState, useEffect, ReactNode } from "react"

export function RevealSection({
    children,
    className = "",
    id,
    delay = 0
}: {
    children: ReactNode;
    className?: string;
    id?: string;
    delay?: number
}) {
    const ref = useRef<HTMLElement>(null)
    const [inView, setInView] = useState(false)
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true)
                observer.disconnect()
            }
        }, { threshold: 0.15 })
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <section
            ref={ref}
            id={id}
            className={className}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0)' : 'translateY(40px)',
                transition: `opacity 0.8s ease ${delay}ms, transform 0.8s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
            }}
        >
            {children}
        </section>
    )
}

export function RevealCard({
    children,
    className = "",
    delay = 0,
    as: Component = "div"
}: {
    children: ReactNode;
    className?: string;
    delay?: number;
    as?: "div" | "article" | "li"
}) {
    const ref = useRef<any>(null)
    const [inView, setInView] = useState(false)
    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) {
                setInView(true)
                observer.disconnect()
            }
        }, { threshold: 0.1 })
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [])

    return (
        <Component
            ref={ref}
            className={className}
            style={{
                opacity: inView ? 1 : 0,
                transform: inView ? 'translateY(0) scale(1)' : 'translateY(20px) scale(0.95)',
                transition: `opacity 0.7s ease ${delay}ms, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${delay}ms`
            }}
        >
            {children}
        </Component>
    )
}
