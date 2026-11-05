import { useCallback, useEffect, useState } from 'react';

/**
 * Marca un contenedor como visible la primera vez que entra en pantalla.
 * Devuelve una ref callback y la clase CSS para la aparición escalonada:
 * los hijos con `reveal-item` (y `--i` como índice) aparecen uno tras otro.
 * Sin IntersectionObserver se muestra directamente, para no dejar nada oculto.
 */
export function useInView<T extends Element>(rootMargin = '0px 0px -10% 0px') {
  const [node, setNode] = useState<T | null>(null);
  const [inView, setInView] = useState(() => typeof IntersectionObserver === 'undefined');

  useEffect(() => {
    if (!node || inView) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [node, inView, rootMargin]);

  const ref = useCallback((el: T | null) => setNode(el), []);

  return { ref, inView, revealClass: inView ? 'is-revealed' : 'reveal-pending' };
}
