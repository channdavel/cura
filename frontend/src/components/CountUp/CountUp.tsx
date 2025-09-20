import { useEffect, useRef } from 'react';

export default function CountUp({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 2,
  className = '',
  startWhen = true,
  separator = '',
  onStart = () => {},
  onEnd = () => {}
}) {
  const ref = useRef(null);

  const getDecimalPlaces = num => {
    const str = num.toString();

    if (str.includes('.')) {
      const decimals = str.split('.')[1];

      if (parseInt(decimals) !== 0) {
        return decimals.length;
      }
    }

    return 0;
  };

  const maxDecimals = Math.max(getDecimalPlaces(from), getDecimalPlaces(to));

  useEffect(() => {
    if (ref.current) {
      ref.current.textContent = String(direction === 'down' ? from : from);
    }
  }, [from, to, direction]);

  useEffect(() => {
    if (startWhen) {
      if (typeof onStart === 'function') onStart();

      const timeoutId = setTimeout(() => {
        const startTime = Date.now();
        const startValue = direction === 'down' ? to : from;
        const endValue = direction === 'down' ? from : to;
        const valueRange = endValue - startValue;

        function updateValue() {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / (duration * 1000), 1);
          
          // Easing function (ease-out)
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentValue = startValue + (valueRange * easeOut);
          
          if (ref.current) {
            const hasDecimals = maxDecimals > 0;

            const options = {
              useGrouping: !!separator,
              minimumFractionDigits: hasDecimals ? maxDecimals : 0,
              maximumFractionDigits: hasDecimals ? maxDecimals : 0
            };

            const formattedNumber = Intl.NumberFormat('en-US', options).format(currentValue);
            ref.current.textContent = separator ? formattedNumber.replace(/,/g, separator) : formattedNumber;
          }

          if (progress < 1) {
            requestAnimationFrame(updateValue);
          } else {
            if (typeof onEnd === 'function') onEnd();
          }
        }

        updateValue();
      }, delay * 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [startWhen, direction, from, to, delay, onStart, onEnd, duration, separator, maxDecimals]);

  return <span className={className} ref={ref} />;
}