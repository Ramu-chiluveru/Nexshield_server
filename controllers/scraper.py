import requests
from bs4 import BeautifulSoup
import json


def scrape_nvd_vulnerabilities():
    print("Running python scripts...")
    try:
        response = requests.get("https://nvd.nist.gov/")
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')

        # Find the div containing the latest vulnerabilities
        latest_vulns_area = soup.find('div', id='latestVulnsArea')
        if not latest_vulns_area:
            print(json.dumps([]))
            return

        vulnerabilities = []
        for item in latest_vulns_area.find_all('li'):
            title_element = item.find('a', id=lambda x: x and x.startswith('cveDetailAnchor-'))
            title = title_element.text.strip() if title_element else 'No Title'
            link = "https://nvd.nist.gov" + title_element['href'] if title_element else '#'
            description = item.find('p').text.strip() if item.find('p') else 'No description available'
            published_date = description.split("Published:")[-1].strip() if "Published:" in description else 'N/A'
            
            cvss_score_element = item.find('span', id=lambda x: x and x.startswith('cvss3-link-'))
            cvss_score = cvss_score_element.text.strip() if cvss_score_element else 'N/A'

            vulnerabilities.append({
                'title': title,
                'link': link,
                'description': description,
                'published_date': published_date,
                'cvss_score': cvss_score
            })

        # print(json.dumps(vulnerabilities[:1]))  # Output the vulnerabilities as JSON
        return vulnerabilities[:1]
    except requests.exceptions.RequestException as e:
        print(json.dumps({"error": str(e)}))


if __name__ == "__main__":
    print("calling from mail")
    vulnerabilities_data = scrape_nvd_vulnerabilities()
    with open('vulnerabilities.json', 'w') as f:
        json.dump(vulnerabilities_data, f, indent=4)