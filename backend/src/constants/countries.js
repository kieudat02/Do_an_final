// Danh sách quốc gia theo châu lục
const COUNTRIES_BY_CONTINENT = {
    'Châu Á': [
        'Afghanistan', 'Armenia', 'Azerbaijan', 'Bahrain', 'Bangladesh', 
        'Bhutan', 'Brunei', 'Campuchia', 'Trung Quốc', 'Cyprus', 
        'Georgia', 'Ấn Độ', 'Indonesia', 'Iran', 'Iraq', 'Israel', 
        'Nhật Bản', 'Jordan', 'Kazakhstan', 'Kuwait', 'Kyrgyzstan', 
        'Lào', 'Lebanon', 'Malaysia', 'Maldives', 'Mongolia', 'Myanmar', 
        'Nepal', 'Triều Tiên', 'Oman', 'Pakistan', 'Palestine', 
        'Philippines', 'Qatar', 'Saudi Arabia', 'Singapore', 'Hàn Quốc', 
        'Sri Lanka', 'Syria', 'Tajikistan', 'Thái Lan', 'Timor-Leste', 
        'Thổ Nhĩ Kỳ', 'Turkmenistan', 'UAE', 'Uzbekistan', 'Việt Nam', 'Yemen'
    ],
    'Châu Âu': [
        'Albania', 'Andorra', 'Armenia', 'Áo', 'Azerbaijan', 'Belarus', 
        'Bỉ', 'Bosnia và Herzegovina', 'Bulgaria', 'Croatia', 'Cyprus', 
        'Cộng hòa Séc', 'Đan Mạch', 'Estonia', 'Phần Lan', 'Pháp', 
        'Georgia', 'Đức', 'Hy Lạp', 'Hungary', 'Iceland', 'Ireland', 
        'Ý', 'Kosovo', 'Latvia', 'Liechtenstein', 'Lithuania', 
        'Luxembourg', 'Malta', 'Moldova', 'Monaco', 'Montenegro', 
        'Hà Lan', 'Bắc Macedonia', 'Na Uy', 'Ba Lan', 'Bồ Đào Nha', 
        'Romania', 'Nga', 'San Marino', 'Serbia', 'Slovakia', 
        'Slovenia', 'Tây Ban Nha', 'Thụy Điển', 'Thụy Sĩ', 'Thổ Nhĩ Kỳ', 
        'Ukraina', 'Anh', 'Vatican'
    ],
    'Châu Phi': [
        'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 
        'Burundi', 'Cameroon', 'Cape Verde', 'Chad', 'Comoros', 
        'Congo', 'Cộng hòa Dân chủ Congo', 'Djibouti', 'Ai Cập', 
        'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia', 
        'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 
        'Ivory Coast', 'Kenya', 'Lesotho', 'Liberia', 'Libya', 
        'Madagascar', 'Malawi', 'Mali', 'Mauritania', 'Mauritius', 
        'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 
        'Rwanda', 'São Tomé và Príncipe', 'Senegal', 'Seychelles', 
        'Sierra Leone', 'Somalia', 'Nam Phi', 'Nam Sudan', 'Sudan', 
        'Tanzania', 'Togo', 'Tunisia', 'Uganda', 'Zambia', 'Zimbabwe'
    ],
    'Châu Mỹ': [
        'Antigua và Barbuda', 'Argentina', 'Bahamas', 'Barbados', 
        'Belize', 'Bolivia', 'Brazil', 'Canada', 'Chile', 'Colombia', 
        'Costa Rica', 'Cuba', 'Dominica', 'Cộng hòa Dominica', 
        'Ecuador', 'El Salvador', 'Grenada', 'Guatemala', 'Guyana', 
        'Haiti', 'Honduras', 'Jamaica', 'Mexico', 'Nicaragua', 
        'Panama', 'Paraguay', 'Peru', 'Saint Kitts và Nevis', 
        'Saint Lucia', 'Saint Vincent và Grenadines', 'Suriname', 
        'Trinidad và Tobago', 'Hoa Kỳ', 'Uruguay', 'Venezuela'
    ],
    'Châu Úc': [
        'Úc', 'Fiji', 'Kiribati', 'Marshall Islands', 'Micronesia', 
        'Nauru', 'New Zealand', 'Palau', 'Papua New Guinea', 'Samoa', 
        'Solomon Islands', 'Tonga', 'Tuvalu', 'Vanuatu'
    ],
    'Châu Nam Cực': [
        'Châu Nam Cực'
    ]
};

// Danh sách tất cả châu lục
const CONTINENTS = [
    'Châu Á',
    'Châu Âu', 
    'Châu Phi',
    'Châu Mỹ',
    'Châu Úc',
    'Châu Nam Cực'
];

// Lấy tất cả quốc gia
const getAllCountries = () => {
    const allCountries = [];
    Object.values(COUNTRIES_BY_CONTINENT).forEach(countries => {
        allCountries.push(...countries);
    });
    return allCountries.sort();
};

// Lấy quốc gia theo châu lục
const getCountriesByContinent = (continent) => {
    return COUNTRIES_BY_CONTINENT[continent] || [];
};

// Lấy châu lục của một quốc gia
const getContinentByCountry = (country) => {
    for (const [continent, countries] of Object.entries(COUNTRIES_BY_CONTINENT)) {
        if (countries.includes(country)) {
            return continent;
        }
    }
    return null;
};

module.exports = {
    COUNTRIES_BY_CONTINENT,
    CONTINENTS,
    getAllCountries,
    getCountriesByContinent,
    getContinentByCountry
};
