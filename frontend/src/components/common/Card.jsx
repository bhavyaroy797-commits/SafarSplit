export default function Card({
  children,
  className = '',
  spatial = false,
  as: Tag = 'div',
  ...rest
}) {
  return (
    <Tag
      className={`card ${spatial ? 'spatial' : ''} ${className}`}
      {...rest}
    >
      {children}
    </Tag>
  );
}