function PlanetCard({ title, description, image, bgColor }) {
  return (
    <div className={`${bgColor} rounded-2xl p-4 relative overflow-hidden shadow-xs hover:shadow-sm transition-shadow`}>
      <img
        src={image}
        alt={title}
        className="absolute top-4 left-4 w-12 h-12 rounded-full object-cover shadow-xs"
      />

      <div className="ml-16">
        <h2 className="text-base font-bold text-gray-800 leading-snug">{title}</h2>

        <p className="text-gray-600 mt-1 text-[11px] leading-relaxed">
          {description}
        </p>

        <button className="mt-2 text-xs font-bold text-orange-600 hover:text-orange-700 transition-colors">
          View &gt;&gt;
        </button>
      </div>
    </div>
  );
}

export default PlanetCard;