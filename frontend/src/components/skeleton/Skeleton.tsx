import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'rect' | 'avatar' | 'card';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  variant = 'text',
  width,
  height,
  className = '',
  style,
  children,
}) => {
  const combinedStyle: React.CSSProperties = {
    width: width !== undefined ? (typeof width === 'number' ? `${width}px` : width) : undefined,
    height: height !== undefined ? (typeof height === 'number' ? `${height}px` : height) : undefined,
    ...style,
  };

  const variantClass = styles[variant] || '';

  return (
    <div
      className={`${styles.skeleton} ${variantClass} ${className}`}
      style={combinedStyle}
      aria-hidden="true"
    >
      {children}
    </div>
  );
};
