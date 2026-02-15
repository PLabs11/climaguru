/**
 * SkeletonLoader — Loading placeholder while fetching weather data
 */
export default function SkeletonLoader() {
    return (
        <div className="skeleton-row">
            <div className="skeleton skeleton-hero" />
            <div className="skeleton skeleton-tabs" />
            <div className="skeleton skeleton-content" />
        </div>
    );
}
