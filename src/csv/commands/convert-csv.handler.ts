
import { CommandHandler, ICommandHandler, EventBus } from '@nestjs/cqrs';
import { ConvertCsvCommand } from './convert-csv.command';
import { CsvConvertedEvent } from '../events/csv-converted.event';
import * as csv from 'csv-parse';
import { ChapterData, MemberData } from '../../shared/interfaces/chapter-data.interface';
import { v4 as uuidv4 } from 'uuid';
 
@CommandHandler(ConvertCsvCommand)
export class ConvertCsvHandler implements ICommandHandler<ConvertCsvCommand> {
  constructor(private readonly eventBus: EventBus) {}
 
  async execute(command: ConvertCsvCommand): Promise<void> {
    const chapterData = await this.parseCsv(command.file);
    const pdfId = uuidv4(); // Generate a new UUID for the PDF
    this.eventBus.publish(new CsvConvertedEvent(chapterData, pdfId));
  }
 
  private async parseCsv(file: Express.Multer.File): Promise<ChapterData> {
    return new Promise((resolve, reject) => {
      const parser = csv.parse({
        columns: true,
        skip_empty_lines: true,
      });
 
      const chapterData: ChapterData = {
        chapterName: '',
        location: '',
        memberSize: 0,
        regionalRank: 0,
        allIndiaRank: 0,
        globalRank: 0,
        chapterLogo: '',
        members: [],
      };
 
      parser.on('readable', () => {
        let record;
        while ((record = parser.read())) {
          if (!chapterData.chapterName) {
            chapterData.chapterName = record.chapterName;
            chapterData.location = record.location;
            chapterData.memberSize = parseInt(record.memberSize) || 0;
            chapterData.regionalRank = parseInt(record.regionalRank) || 0;
            chapterData.allIndiaRank = parseInt(record.allIndiaRank) || 0;
            chapterData.globalRank = parseInt(record.globalRank) || 0;
            chapterData.chapterLogo = record.chapterLogo || '';
          }
 
          const member: MemberData = {
            name: record.name || '',
            companyName: record.companyName || '',
            email: record.email || '',
            phone: record.phone || '',
            category: record.category || '',
            photo: record.photo || '',
            companyLogo: record.companyLogo || '',
          };
          chapterData.members.push(member);
        }
      });
 
      parser.on('error', (err) => {
        reject(err);
      });
 
      parser.on('end', () => {
        resolve(chapterData);
      });
 
      // Ensure file.buffer is accessible and contains the CSV data
      if (file && file.buffer) {
        parser.write(file.buffer);
      } else {
        reject(new Error('File buffer is missing or empty'));
      }
 
      parser.end();
    });
  }
}

