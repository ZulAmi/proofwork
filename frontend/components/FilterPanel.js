import React, { useState } from 'react';
import { Transition } from '@headlessui/react';

const FilterPanel = ({ availableSkills, filters, setFilters }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <div className="mt-6 bg-white dark:bg-gray-800 shadow rounded-lg overflow-hidden">
            <div className="p-4 flex justify-between items-center cursor-pointer"
                onClick={() => setIsExpanded(!isExpanded)}>
                <div className="font-medium">Filter Freelancers</div>
                <svg
                    className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
            </div>

            <Transition
                show={isExpanded}
                enter="transition ease-out duration-100"
                enterFrom="transform opacity-0 scale-95"
                enterTo="transform opacity-100 scale-100"
                leave="transition ease-in duration-75"
                leaveFrom="transform opacity-100 scale-100"
                leaveTo="transform opacity-0 scale-95"
            >
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Skills filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Skills
                            </label>
                            <select
                                multiple
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                value={filters.skills}
                                onChange={(e) => {
                                    const selectedSkills = Array.from(
                                        e.target.selectedOptions,
                                        (option) => option.value
                                    );
                                    setFilters({ ...filters, skills: selectedSkills });
                                }}
                            >
                                {availableSkills.map((skill) => (
                                    <option key={skill} value={skill}>
                                        {skill}
                                    </option>
                                ))}
                            </select>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                Hold Ctrl/Cmd to select multiple
                            </p>
                        </div>

                        {/* Rating range */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Rating Range
                            </label>
                            <div className="flex items-center mt-1 space-x-2">
                                <select
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    value={filters.minRating}
                                    onChange={(e) => setFilters({ ...filters, minRating: Number(e.target.value) })}
                                >
                                    {[0, 1, 2, 3, 4].map((rating) => (
                                        <option key={rating} value={rating}>
                                            {rating} ★
                                        </option>
                                    ))}
                                </select>
                                <span className="text-gray-500">to</span>
                                <select
                                    className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                    value={filters.maxRating}
                                    onChange={(e) => setFilters({ ...filters, maxRating: Number(e.target.value) })}
                                >
                                    {[1, 2, 3, 4, 5].map((rating) => (
                                        <option key={rating} value={rating}>
                                            {rating} ★
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Verification filter */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Verification
                            </label>
                            <div className="mt-1">
                                <label className="inline-flex items-center">
                                    <input
                                        type="checkbox"
                                        className="focus:ring-indigo-500 h-4 w-4 text-indigo-600 border-gray-300 dark:border-gray-600 rounded"
                                        checked={filters.verified}
                                        onChange={(e) => setFilters({ ...filters, verified: e.target.checked })}
                                    />
                                    <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                        Only verified freelancers
                                    </span>
                                </label>
                            </div>
                        </div>

                        {/* Sort options */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                Sort By
                            </label>
                            <select
                                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                                value={`${filters.sortBy}-${filters.sortDirection}`}
                                onChange={(e) => {
                                    const [sortBy, sortDirection] = e.target.value.split('-');
                                    setFilters({ ...filters, sortBy, sortDirection });
                                }}
                            >
                                <option value="trustScore-desc">Trust Score: High to Low</option>
                                <option value="trustScore-asc">Trust Score: Low to High</option>
                                <option value="reviewCount-desc">Most Reviews</option>
                                <option value="reviewCount-asc">Fewest Reviews</option>
                                <option value="recent-desc">Recently Active</option>
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={() => setFilters({
                                skills: [],
                                minRating: 0,
                                maxRating: 5,
                                verified: false,
                                sortBy: 'trustScore',
                                sortDirection: 'desc'
                            })}
                            className="mr-2 inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Reset
                        </button>
                        <button
                            onClick={() => setIsExpanded(false)}
                            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                        >
                            Apply Filters
                        </button>
                    </div>
                </div>
            </Transition>
        </div>
    );
};

export default FilterPanel;